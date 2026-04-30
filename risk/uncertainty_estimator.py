import math

RISK_PROBABILITY_MAP = {
    "Low": 0.2,
    "Medium": 0.5,
    "High": 0.85
}

def entropy(p):
    """Binary entropy"""
    if p == 0 or p == 1:
        return 0
    return - (p * math.log2(p) + (1 - p) * math.log2(1 - p))

def estimate_confidence_and_uncertainty(
    final_risk,
    future_risk,
    spatial_risk,
    counterfactual_result
):
    """
    Returns confidence (%) and uncertainty score
    """

    probs = []

    # Final predicted risk
    probs.append(RISK_PROBABILITY_MAP[final_risk])

    # Temporal future risk
    probs.append(RISK_PROBABILITY_MAP[future_risk])

    # Spatial propagated risk
    if spatial_risk:
        highest_spatial = max(
            spatial_risk.values(),
            key=lambda x: RISK_PROBABILITY_MAP[x]
        )
        probs.append(RISK_PROBABILITY_MAP[highest_spatial])

    # Counterfactual worst-case
    worst_cf = max(
        counterfactual_result["scenarios"].values(),
        key=lambda x: RISK_PROBABILITY_MAP[x]
    )
    probs.append(RISK_PROBABILITY_MAP[worst_cf])

    avg_prob = sum(probs) / len(probs)

    # Confidence = certainty of high/low decision
    confidence = round(avg_prob * 100, 2)

    # Uncertainty = entropy
    uncertainty = round(entropy(avg_prob), 3)

    return confidence, uncertainty
