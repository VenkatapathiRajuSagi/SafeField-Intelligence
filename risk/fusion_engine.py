def fuse_risk(snake, fall, heat):
    if snake or fall:
        return "High"
    if heat:
        return "Medium"
    return "Low"
