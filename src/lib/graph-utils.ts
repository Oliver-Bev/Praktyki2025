import type { Graph, ParsedNodeInfo } from "./game-types"

export function parseNodeId(id: string): ParsedNodeInfo | null {
  const parts = id.split("_")
  const layer = parts[0]

  const coordPart = parts[1]
  const rowMatch = coordPart.match(/R(\d+)/)
  const colMatch = coordPart.match(/C(\d+)/)

  if (!rowMatch || !colMatch) {
    console.error("Błędny format:", coordPart)
    return null
  }

  const row = Number.parseInt(rowMatch[1])
  const col = Number.parseInt(colMatch[1])

  const quarter = parts[3]
  const subQuarter = parts[4]

  return { layer, row, col, quarter, subQuarter }
}

export function getConnectedNodes(graph: Graph, nodeId: string, bidirectional = true): string[] {
  let connectedNodes: string[] = []

  // Połączenia wychodzące
  const outgoingEdges = graph.edges.filter((edge) => edge.source === nodeId)
  const outgoingNodes = outgoingEdges.map((edge) => edge.target)
  connectedNodes = [...connectedNodes, ...outgoingNodes]

  // Połączenia przychodzące (dwukierunkowe)
  if (bidirectional) {
    const incomingEdges = graph.edges.filter((edge) => edge.target === nodeId)
    const incomingNodes = incomingEdges.map((edge) => edge.source)
    connectedNodes = [...connectedNodes, ...incomingNodes]
  }

  // Usuń duplikaty i filtruj tylko istniejące węzły
  connectedNodes = [...new Set(connectedNodes)]
  return connectedNodes.filter((nodeId) => graph.nodes.some((node) => node.id === nodeId))
}

export function getRandomNode(graph: Graph): string {
  const randomIndex = Math.floor(Math.random() * graph.nodes.length)
  return graph.nodes[randomIndex].id
}

export function getNodeInDirection(
  graph: Graph,
  currentNodeId: string,
  direction: "up" | "down" | "left" | "right",
  currentLayer: string,
): string | null {
  const availableNodes = getConnectedNodes(graph, currentNodeId)

  if (!availableNodes.length) return null

  const currentInfo = parseNodeId(currentNodeId)
  if (!currentInfo) return null

  // Filtruj węzły wg kierunku i warstwy
  const targetNodes = availableNodes.filter((nodeId) => {
    const nodeInfo = parseNodeId(nodeId)
    if (!nodeInfo) return false

    // Sprawdź czy to ta sama warstwa lub kompatybilna
    const isCompatibleLayer =
      nodeInfo.layer === currentLayer ||
      (currentLayer === "SIDEWALKS" && ["METRO", "TRACKS", "RIVERFERRY", "RIVERBOAT"].includes(nodeInfo.layer)) ||
      (currentLayer === "ROADS" && ["TUNEL", "OBJECTS"].includes(nodeInfo.layer))

    if (!isCompatibleLayer) return false

    // Sprawdź kierunek z tolerancją
    const rowDiff = nodeInfo.row - currentInfo.row
    const colDiff = nodeInfo.col - currentInfo.col

    switch (direction) {
      case "up":
        return rowDiff < 0 && Math.abs(colDiff) <= Math.abs(rowDiff)
      case "down":
        return rowDiff > 0 && Math.abs(colDiff) <= Math.abs(rowDiff)
      case "left":
        return colDiff < 0 && Math.abs(rowDiff) <= Math.abs(colDiff)
      case "right":
        return colDiff > 0 && Math.abs(rowDiff) <= Math.abs(colDiff)
      default:
        return false
    }
  })

  // Sortuj po odległości
  const sortedNodes = targetNodes.sort((a, b) => {
    const aInfo = parseNodeId(a)
    const bInfo = parseNodeId(b)
    if (!aInfo || !bInfo) return 0

    const aDist = Math.abs(aInfo.row - currentInfo.row) + Math.abs(aInfo.col - currentInfo.col)
    const bDist = Math.abs(bInfo.row - currentInfo.row) + Math.abs(bInfo.col - currentInfo.col)
    return aDist - bDist
  })

  return sortedNodes.length > 0 ? sortedNodes[0] : null
}
