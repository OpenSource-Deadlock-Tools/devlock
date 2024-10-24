// prometheusMetrics.ts

import { Metrics } from "./metrics";
import * as promClient from "prom-client";

// PrometheusMetrics implements the Metrics interface
export class PrometheusMetrics implements Metrics {
	private counters: { [key: string]: promClient.Counter } = {};
	private gauges: { [key: string]: promClient.Gauge } = {};
	private histograms: { [key: string]: promClient.Histogram } = {};

	incrementCounter(name: string, value: number = 1): void {
		if (!this.counters[name]) {
			this.counters[name] = new promClient.Counter({
				name,
				help: `${name} counter`,
			});
		}
		this.counters[name].inc(value);
	}

	updateGauge(name: string, value: number): void {
		if (!this.gauges[name]) {
			this.gauges[name] = new promClient.Gauge({ name, help: `${name} gauge` });
		}
		this.gauges[name].set(value);
	}

	recordHistogram(name: string, value: number): void {
		if (!this.histograms[name]) {
			this.histograms[name] = new promClient.Histogram({
				name,
				help: `${name} histogram`,
			});
		}
		this.histograms[name].observe(value);
	}
}
