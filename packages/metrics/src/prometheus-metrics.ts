import { Metrics, Labels } from "./metrics";
import * as promClient from "prom-client";

// PrometheusMetrics implements the Metrics interface with labels
class PrometheusMetrics implements Metrics {
	private counters: { [key: string]: promClient.Counter<string> } = {};
	private gauges: { [key: string]: promClient.Gauge<string> } = {};
	private histograms: { [key: string]: promClient.Histogram<string> } = {};

	private register?: promClient.Registry;

	constructor({ register }: { register?: promClient.Registry } = {}) {
		this.register = register;
	}

	incrementCounter(name: string, value: number = 1, labels?: Labels): void {
		const labelNames = labels ? Object.keys(labels).sort() : [];
		const key = this.getMetricKey(name, labelNames);

		if (!this.counters[key]) {
			this.counters[key] = new promClient.Counter({
				registers: this.getRegisters(),
				name,
				help: `${name} counter`,
				labelNames,
			});
		}

		if (labels) {
			this.counters[key].inc(labels, value);
		} else {
			this.counters[key].inc(value);
		}
	}

	updateGauge(name: string, value: number, labels?: Labels): void {
		const labelNames = labels ? Object.keys(labels).sort() : [];
		const key = this.getMetricKey(name, labelNames);

		if (!this.gauges[key]) {
			this.gauges[key] = new promClient.Gauge({
				registers: this.getRegisters(),
				name,
				help: `${name} gauge`,
				labelNames,
			});
		}

		if (labels) {
			this.gauges[key].set(labels, value);
		} else {
			this.gauges[key].set(value);
		}
	}

	recordHistogram(name: string, value: number, labels?: Labels): void {
		const labelNames = labels ? Object.keys(labels).sort() : [];
		const key = this.getMetricKey(name, labelNames);

		if (!this.histograms[key]) {
			this.histograms[key] = new promClient.Histogram({
				registers: this.getRegisters(),
				name,
				help: `${name} histogram`,
				labelNames,
			});
		}

		if (labels) {
			this.histograms[key].observe(labels, value);
		} else {
			this.histograms[key].observe(value);
		}
	}

	// Helper method to generate a unique key based on metric name and labels
	private getMetricKey(name: string, labelNames: string[]): string {
		return name;
		// return `${name}:${labelNames.join(",")}`;
	}

	private getRegisters(): promClient.Registry[] | undefined {
		return this.register ? [this.register] : undefined;
	}
}

// Export PrometheusMetrics for setting as the global recorder
export { PrometheusMetrics };
