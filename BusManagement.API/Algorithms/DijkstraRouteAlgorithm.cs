namespace BusManagement.API.Algorithms;

public class GraphEdge
{
    public int FromStopId { get; init; }
    public int ToStopId { get; init; }
    public int RouteId { get; init; }
    public string RouteCode { get; init; } = null!;
    public string RouteName { get; init; } = null!;
    public double DistanceKm { get; init; }
    public int StopOrder { get; init; }
}

public enum RoutingCriteria { ShortestDistance, FewestStops, FewestTransfers }

public class DijkstraRouteAlgorithm
{
    private readonly List<GraphEdge> _edges;

    public DijkstraRouteAlgorithm(List<GraphEdge> edges) => _edges = edges;

    public List<List<GraphEdge>>? FindPath(int fromStopId, int toStopId, RoutingCriteria criteria)
    {
        // Build adjacency: stopId -> list of edges leaving that stop
        var adj = _edges.GroupBy(e => e.FromStopId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var dist = new Dictionary<int, double>();
        var prev = new Dictionary<int, (int stopId, GraphEdge? edge)>();
        var visited = new HashSet<int>();
        var queue = new PriorityQueue<int, double>();

        dist[fromStopId] = 0;
        queue.Enqueue(fromStopId, 0);

        while (queue.Count > 0)
        {
            var current = queue.Dequeue();
            if (!visited.Add(current)) continue;
            if (current == toStopId) break;

            if (!adj.TryGetValue(current, out var neighbors)) continue;

            foreach (var edge in neighbors)
            {
                double weight = criteria switch
                {
                    RoutingCriteria.ShortestDistance => edge.DistanceKm,
                    RoutingCriteria.FewestStops => 1,
                    RoutingCriteria.FewestTransfers => prev.TryGetValue(current, out var p) && p.edge?.RouteId != edge.RouteId ? 100 : 1,
                    _ => edge.DistanceKm
                };

                double newDist = dist.GetValueOrDefault(current, double.MaxValue) + weight;
                if (newDist < dist.GetValueOrDefault(edge.ToStopId, double.MaxValue))
                {
                    dist[edge.ToStopId] = newDist;
                    prev[edge.ToStopId] = (current, edge);
                    queue.Enqueue(edge.ToStopId, newDist);
                }
            }
        }

        if (!prev.ContainsKey(toStopId)) return null;

        // Reconstruct path as segments grouped by route
        var edgePath = new List<GraphEdge>();
        int node = toStopId;
        while (prev.TryGetValue(node, out var p) && p.edge is not null)
        {
            edgePath.Insert(0, p.edge);
            node = p.stopId;
        }

        // Group consecutive edges by route into segments
        var segments = new List<List<GraphEdge>>();
        List<GraphEdge>? current_segment = null;
        foreach (var edge in edgePath)
        {
            if (current_segment is null || current_segment[0].RouteId != edge.RouteId)
            {
                current_segment = [edge];
                segments.Add(current_segment);
            }
            else
            {
                current_segment.Add(edge);
            }
        }

        return segments;
    }
}
