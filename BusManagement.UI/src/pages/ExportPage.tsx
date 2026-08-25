import { useState } from 'react';
import { exportApi } from '../api';
import { useToast } from '../toast';

export default function ExportPage() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const downloadGtfs = async () => {
    setLoading(true);
    try {
      const blob = await exportApi.gtfs();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gtfs_export.zip';
      a.click();
      URL.revokeObjectURL(url);
      toast('GTFS export downloaded', 'success');
    } catch { toast('GTFS export failed', 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Export Data</div>
      </div>
      <div style={{ padding: '16px 0' }}>
        <div className="card" style={{ maxWidth: 420 }}>
          <div className="card-header">
            <div>
              <div className="card-title" style={{ fontSize: 15 }}>GTFS Export</div>
              <div className="text-muted" style={{ marginTop: 4, fontSize: 13 }}>
                Download all stops, routes, and fares as a GTFS-compliant zip file
                compatible with Google Maps, Apple Maps, and transit planning tools.
              </div>
            </div>
          </div>
          <div style={{ padding: '0 0 4px' }}>
            <button className="btn btn-primary" onClick={downloadGtfs} disabled={loading}>
              {loading ? 'Generating…' : '⬇ Download GTFS (.zip)'}
            </button>
          </div>
          <div className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>
            Includes: stops.txt · routes.txt · trips.txt · stop_times.txt · fare_attributes.txt · fare_rules.txt
          </div>
        </div>
      </div>
    </div>
  );
}
