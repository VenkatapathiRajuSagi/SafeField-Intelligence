import networkx as nx

G = nx.Graph()
G.add_edges_from([
    ("Field_A", "Field_B"),
    ("Field_B", "Field_C")
])

def propagate_risk(area, risk):
    affected = list(G.neighbors(area))
    return affected if risk == "High" else []
