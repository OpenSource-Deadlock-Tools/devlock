using System.Text;
using System.Timers;
using DeadlockAPI;
using DeadlockSpectatorServer;
using RabbitMQ.Client;

class Program
{
    // Number of **total** matches we'd like to spectate, including previously
    // spectated matches. Defaults to 250.
    private static int threshold;

    // RabbitMQ variables
    private static string rmq_host, rmq_user, rmq_pass;
    private static int rmq_port;
    private static readonly string rmq_queue_name = "spectate_queue";
    private static IModel rmq_channel;
    private static IConnection rmq_connection;

    // How often to update the queue
    private static System.Timers.Timer queue_timer = new(TimeSpan.FromSeconds(20));

    // Our connection to Deadlock GC (Game Coordinator)
    private static string steam_user, steam_pass;
    private static DeadlockClient? client;
    private static AutoResetEvent client_status = new(initialState: false);

    private static void Main(string[] args)
    {
        // Environment variables
        steam_user = Environment.GetEnvironmentVariable("STEAM_USERNAME") ?? "steamuser";
        steam_pass = Environment.GetEnvironmentVariable("STEAM_PASSWORD") ?? "steampass";
        threshold = int.TryParse(Environment.GetEnvironmentVariable("SPECTATOR_THRESHOLD"), out int thresh)
            ? thresh : 250;

        rmq_host = Environment.GetEnvironmentVariable("RABBITMQ_HOST") ?? "rabbitmq";
        rmq_port = int.Parse(Environment.GetEnvironmentVariable("RABBITMQ_PORT") ?? "5672");
        rmq_user = Environment.GetEnvironmentVariable("RABBITMQ_DEFAULT_USER") ?? "guest";
        rmq_pass = Environment.GetEnvironmentVariable("RABBITMQ_DEFAULT_PASS") ?? "guest";

        // Login to Steam
        client = new DeadlockClient(steam_user, steam_pass);
        client.ClientWelcomeEvent += (sender, e) => { client_status.Set(); };
        client.Start();

        client_status.WaitOne(); // Block the thread until the ClientWelcomeEvent is raised

        // Initialize RMQ
        var factory = new ConnectionFactory()
        {
            HostName = rmq_host,
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

        // Set up the timer to run the job every 20 seconds
        queue_timer.Elapsed += UpdateQueue;
        queue_timer.AutoReset = true; // Make sure the timer runs continuously
        queue_timer.Enabled = true;

        Thread.Sleep(Timeout.Infinite); // Keep program running
    }

    private static void UpdateQueue(object? source, ElapsedEventArgs e)
    {
        // Get all the active matches
        var matches = client?.GetActiveMatches().Result?.active_matches;

        if (matches == null)
        {
            Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] No active matches found.");
            return;
        }

        var actives = matches.Count(match => match.spectators > 0);
        Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] Found {actives} active matches.");

        // Use LINQ to filter, calculate and sort matches by priority
        var sortedMatches = matches?
            .Where(match => match.spectators == 0) // Only take matches with no current spectators
            .Where(match => match.match_score > 500) // No low elo matches allowed
            .Select(match => new
            {
                Match = match,
                Priority = Priority.Calculate(match)
            })
            .Where(m => m.Priority != 0)
            .OrderByDescending(m => m.Priority)
            .ThenByDescending(m => m.Match.match_score)
            .ThenBy(m => m.Match.start_time)
            .Select(m => m.Match) // Select only the matches after sorting
            .Take(threshold - actives > 0 ? threshold - actives : 0)
            .ToList();

        if (sortedMatches == null || sortedMatches.Count == 0)
        {
            Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] No matches to spectate.");
            return;
        }

        sortedMatches.Select(match => Encoding.UTF8.GetBytes(match.match_id.ToString()))
            .ToList()
            .ForEach(body =>
                rmq_channel.BasicPublish(exchange: "", routingKey: rmq_queue_name, basicProperties: null, body: body));
        Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] Queued {sortedMatches.Count} matches.");
    }
}
