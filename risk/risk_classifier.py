RISK_ORDER = {"Low": 0, "Medium": 1, "High": 2}

def classify_predictive_risk(
    current_risk,
    future_risk,
    counterfactual_result,
    spatial_risk
):
    """
    Combines multiple intelligence layers into final risk level
    """

    scores = []

    # Current perception risk
    scores.append(RISK_ORDER[current_risk])

    # Temporal future risk
    scores.append(RISK_ORDER[future_risk])

    # Counterfactual worst-case scenario
    worst_cf = max(
        counterfactual_result["scenarios"].values(),
        key=lambda x: RISK_ORDER[x]
    )
    scores.append(RISK_ORDER[worst_cf])

    # Spatial propagation risk
    if spatial_risk:
        highest_spatial = max(
            spatial_risk.values(),
            key=lambda x: RISK_ORDER[x]
        )
        scores.append(RISK_ORDER[highest_spatial])

    # Final predictive risk
    final_score = max(scores)

    for k, v in RISK_ORDER.items():
        if v == final_score:
            return k
