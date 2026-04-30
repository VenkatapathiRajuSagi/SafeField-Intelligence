from spatial.area_graph import load_area_graph

G = load_area_graph()

RISK_SCORE = {
    "Low": 0.2,
    "Medium": 0.6,
    "High": 1.0
}

def propagate_spatial_risk(source_area, source_risk):
    """
    Propagate risk to neighboring areas
    """
    affected_areas = {}

    if source_area not in G:
        return {}

    for neighbor in G.neighbors(source_area):
        propagated_score = RISK_SCORE.get(source_risk, 0.2) * 0.6

        if propagated_score > 0.7:
            affected_areas[neighbor] = "High"
        elif propagated_score > 0.4:
            affected_areas[neighbor] = "Medium"
        else:
            affected_areas[neighbor] = "Low"

    return affected_areas
