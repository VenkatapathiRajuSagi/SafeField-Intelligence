import json
import networkx as nx

def load_area_graph():
    with open("data/areas.json", "r") as f:
        area_map = json.load(f)

    G = nx.Graph()

    for area, neighbors in area_map.items():
        for n in neighbors:
            G.add_edge(area, n)

    return G
