import React, { useEffect, useState } from 'react';
import api from '../services/api';

const IoTReadings = ({ projectId }) => {
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    api.get(`/api/iot/readings?projectId=${projectId}`)
      .then(res => {
        setReadings(res.data.readings || []);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to fetch IoT readings');
        setLoading(false);
      });
  }, [projectId]);

  if (!projectId) return <div>No project selected.</div>;
  if (loading) return <div>Loading IoT readings...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="overflow-x-auto mt-4">
      <h3 className="text-lg font-semibold mb-2">IoT Readings</h3>
      <table className="min-w-full bg-white border border-gray-200">
        <thead>
          <tr>
            <th className="px-4 py-2 border">Sensor ID</th>
            <th className="px-4 py-2 border">Temperature (°C)</th>
            <th className="px-4 py-2 border">Humidity (%)</th>
            <th className="px-4 py-2 border">Sunlight</th>
            <th className="px-4 py-2 border">Risk Level</th>
            <th className="px-4 py-2 border">Created At</th>
          </tr>
        </thead>
        <tbody>
          {readings.length === 0 ? (
            <tr><td colSpan="6" className="text-center py-4">No readings found.</td></tr>
          ) : (
            readings.map(r => (
              <tr key={r._id}>
                <td className="px-4 py-2 border">{r.sensorId}</td>
                <td className="px-4 py-2 border">{r.temperature}</td>
                <td className="px-4 py-2 border">{r.humidity}</td>
                <td className="px-4 py-2 border">{r.sunlight}</td>
                <td className="px-4 py-2 border">{r.riskLevel}</td>
                <td className="px-4 py-2 border">{new Date(r.createdAt).toLocaleString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default IoTReadings;
