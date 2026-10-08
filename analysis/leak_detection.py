"""Transparent leakage detection demo for Water Leakage Detection Systems."""

from pathlib import Path

import numpy as np
import pandas as pd

try:
    from sklearn.ensemble import IsolationForest
except ImportError:  # Keep the basic demo runnable before optional ML packages are installed.
    IsolationForest = None

DATA_PATH = Path(__file__).parents[1] / "data" / "mock_sensor_readings.csv"


def analyse_network(readings: pd.DataFrame) -> dict[str, object]:
    data = readings.copy()
    data["pressure_residual"] = data["expected_pressure_bar"] - data["measured_pressure_bar"]
    data["segment_pressure_drop"] = data["measured_pressure_bar"].diff().abs().fillna(0.0)
    flow_imbalance = float(data["flow_lps"].iloc[0] - data["flow_lps"].iloc[-1])
    max_residual = float(data["pressure_residual"].max())
    pressure_score = np.clip(max_residual / 1.25, 0.0, 1.0)
    flow_score = np.clip(flow_imbalance / 8.0, 0.0, 1.0)
    confidence = round(float((0.6 * pressure_score + 0.4 * flow_score) * 100), 1)
    features = data[["pressure_residual", "segment_pressure_drop"]]
    if IsolationForest is not None:
        detector = IsolationForest(contamination=0.2, random_state=42)
        data["anomaly"] = detector.fit_predict(features)
    else:
        threshold = float(data["pressure_residual"].mean() + 0.75 * data["pressure_residual"].std())
        data["anomaly"] = np.where(data["pressure_residual"] > threshold, -1, 1)
    downstream_index = int(data["segment_pressure_drop"].idxmax())
    upstream_index = max(0, downstream_index - 1)
    segment = f"{data.loc[upstream_index, 'sensor']} -> {data.loc[downstream_index, 'sensor']}"
    return {"leak_detected": confidence >= 60, "confidence_percent": confidence, "estimated_flow_loss_lps": round(flow_imbalance, 1), "likely_segment": segment, "downstream_place": data.loc[downstream_index, "place"], "anomalous_sensors": data.loc[data["anomaly"] == -1, "sensor"].tolist()}


if __name__ == "__main__":
    result = analyse_network(pd.read_csv(DATA_PATH))
    print("Water Leakage Detection Systems analysis")
    for key, value in result.items():
        print(f"{key}: {value}")
