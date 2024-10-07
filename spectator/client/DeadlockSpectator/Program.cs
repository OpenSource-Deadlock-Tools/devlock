using System.Text;
using DeadlockAPI;
using ouwou.GC.Deadlock.Internal;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

class Program
{
    // Our connection to Deadlock GC (Game Coordinator)
    private static string steam_user, steam_pass;
    private static DeadlockClient? client;

    private static readonly EventWaitHandle client_status = new AutoResetEvent(false);

    // Rate limit, interval for polling GC in milliseconds
    private static readonly TimeSpan gc_rate_limit = TimeSpan.FromMilliseconds(2500);
    private static DateTime request_time;
    private static TimeSpan request_duration;

    // RabbitMQ variables
    private static string rmq_host, rmq_user, rmq_pass;
    private static int rmq_port;
    private static readonly string rmq_queue_name = "spectate_queue";
    private static IModel rmq_channel;
    private static IConnection rmq_connection;

    private static void Main(string[] args)
    {
        // Load all environment variables
        steam_user = Environment.GetEnvironmentVariable("STEAM_USERNAME") ?? "steamuser";
        steam_pass = Environment.GetEnvironmentVariable("STEAM_PASSWORD") ?? "steampass";

        rmq_host = Environment.GetEnvironmentVariable("RABBITMQ_HOST") ?? "rabbitmq";
        rmq_port = int.Parse(Environment.GetEnvironmentVariable("RABBITMQ_PORT") ?? "5672");
        rmq_user = Environment.GetEnvironmentVariable("RABBITMQ_ADMIN_USER") ?? "rmquser";
        rmq_pass = Environment.GetEnvironmentVariable("RABBITMQ_ADMIN_PASS") ?? "rmqpass";

        // Login to Steam
        client = new DeadlockClient(steam_user, steam_pass);
        client.ClientWelcomeEvent += (sender, e) => { client_status.Set(); };
        client.Start();

        client_status.WaitOne(); // Block the thread until the ClientWelcomeEvent is raised

        // Initialize RMQ
        // RabbitMQ connection details
        var factory = new ConnectionFactory()
        {
            HostName = rmq_host,
            Port = rmq_port,
            UserName = rmq_user,
            Password = rmq_pass
        };

        while (rmq_connection == null)
        {
            try
            {
                rmq_connection = factory.CreateConnection();
            }
            catch (RabbitMQ.Client.Exceptions.BrokerUnreachableException)
            {
                Console.Error.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] Could not connect to RabbitMQ. Retrying in 10s...");
                Thread.Sleep(TimeSpan.FromSeconds(10));
            }
        }

        rmq_channel = rmq_connection.CreateModel();

        // Create an event-based consumer
        var consumer = new EventingBasicConsumer(rmq_channel);

        // This event is triggered whenever a message is received
        consumer.Received += (_, ea) =>
        {
            // Get the next match id in the queue
            var body = ea.Body.ToArray();
            var message = Encoding.UTF8.GetString(body);
            var id = uint.Parse(message);

            // Send request to GC in order to prompt hltv stream
            request_time = DateTime.Now;
            var spectateLobbyResponse = client?.SpectateLobby(id).Result;
            var status = spectateLobbyResponse?.result.result;
            request_duration = DateTime.Now - request_time;

            switch (status)
            {
                case CMsgClientToGCSpectateUserResponse.EResponse.k_eSuccess:
                    // Thank you Valve very cool
                    rmq_channel.BasicAck(deliveryTag: ea.DeliveryTag, multiple: false);
                    Console.WriteLine(
                        $"[{DateTime.Now:HH:mm:ss.fff}] Spectating {id} [{request_duration.TotalMilliseconds}ms]");
                    break;
                case CMsgClientToGCSpectateUserResponse.EResponse.k_eNotInGame:
                    // We're too late to spectate this game. We'll send a Nack but make sure
                    // it is not re-added to the queue by specifying requeue: false
                    rmq_channel.BasicNack(deliveryTag: ea.DeliveryTag, multiple: false, requeue: false);
                    Console.Error.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] Failed {id} [{status}]");
                    break;
                case CMsgClientToGCSpectateUserResponse.EResponse.k_eRateLimited:
                    // We did an oopsie...
                    rmq_channel.BasicNack(deliveryTag: ea.DeliveryTag, multiple: false, requeue: true);
                    Console.Error.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] Failed {id} [{status}]");
                    Thread.Sleep(TimeSpan.FromSeconds(90));
                    break;
                case CMsgClientToGCSpectateUserResponse.EResponse.k_eInvalidClientVersion:
                    // Trigger program restart if invalid client version. Client version is automatically
                    // set on program start, so when docker restarts the program, the client version
                    // will be updated to the most recent number.
                    rmq_channel.BasicNack(deliveryTag: ea.DeliveryTag, multiple: false, requeue: true);
                    throw new InvalidOperationException("Invalid client version.");
                default:
                    // I've never seen any other response besides the above four so let's hope
                    // this branch is never reached.
                    rmq_channel.BasicNack(deliveryTag: ea.DeliveryTag, multiple: false, requeue: true);
                    Console.Error.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] Failed {id} ({status})");
                    break;
            }

            // GC rate limit
            if (request_duration < gc_rate_limit)
                Thread.Sleep(gc_rate_limit - request_duration);
        };

        // Start consuming messages
        rmq_channel.BasicQos(prefetchCount: 1, prefetchSize: default, global: default);
        rmq_channel.BasicConsume(queue: rmq_queue_name,
            autoAck: false, // Enable manual message acknowledgment
            consumer: consumer);

        Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] Ready for messages.");

        Thread.Sleep(Timeout.Infinite); // Prevent program from exiting
    }
}
