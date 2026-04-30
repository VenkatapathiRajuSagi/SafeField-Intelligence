def counterfactual_reasoning(
    current_risk,
    future_risk,
    snake_detected,
    fall_detected
):
    """
    Evaluates multiple future scenarios and recommends safest action
    """

    scenarios = {}

    # Scenario 1: Farmer stays
    scenarios["stay"] = future_risk

    # Scenario 2: Farmer moves away
    if snake_detected:
        scenarios["move_away"] = "Low"
    else:
        scenarios["move_away"] = future_risk

    # Scenario 3: Farmer continues working
    if snake_detected or fall_detected:
        scenarios["continue_working"] = "High"
    else:
        scenarios["continue_working"] = future_risk

    # Determine safest action
    safest_action = min(
        scenarios,
        key=lambda k: ["Low", "Medium", "High"].index(scenarios[k])
    )

    return {
        "current_risk": current_risk,
        "predicted_risk": future_risk,
        "scenarios": scenarios,
        "recommended_action": safest_action
    }
