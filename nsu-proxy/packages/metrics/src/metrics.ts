// metrics.ts

// Define the Labels type
export type Labels = { [key: string]: string };

// Define the Metrics interface with labels
export interface Metrics {
  incrementCounter(name: string, value?: number, labels?: Labels): void;
  updateGauge(name: string, value: number, labels?: Labels): void;
  recordHistogram(name: string, value: number, labels?: Labels): void;
}

// No-operation implementation of Metrics (default recorder)
export class NoopMetrics implements Metrics {
  incrementCounter(name: string, value: number = 1, labels?: Labels): void {}
  updateGauge(name: string, value: number, labels?: Labels): void {}
  recordHistogram(name: string, value: number, labels?: Labels): void {}
}

// Singleton MetricsFacade to hold the global recorder
export class MetricsFacade {
  private static recorder: Metrics = new NoopMetrics();

  // Set the global metrics recorder
  public static setRecorder(recorder: Metrics): void {
    MetricsFacade.recorder = recorder;
  }

  // Increment a counter metric
  public static incrementCounter(name: string, value: number = 1, labels?: Labels): void {
    MetricsFacade.recorder.incrementCounter(name, value, labels);
  }

  // Update a gauge metric
  public static updateGauge(name: string, value: number, labels?: Labels): void {
    MetricsFacade.recorder.updateGauge(name, value, labels);
  }

  // Record a histogram metric
  public static recordHistogram(name: string, value: number, labels?: Labels): void {
    MetricsFacade.recorder.recordHistogram(name, value, labels);
  }
}
