export interface Coordinates {
  row: number
  column: number
}

export interface MoveData {
  coordinates: Coordinates
  elementDefinitionName: string
  rotation: string
}

export interface Move {
  move: MoveData
}

export interface MovesResponse {
  moves?: Move[]
}

export interface GraphNode {
  id: string
}

export interface GraphEdge {
  source: string
  target: string
}

export interface Graph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface ParsedNodeInfo {
  layer: string
  row: number
  col: number
  quarter: string | null
  subQuarter: string | null
}

export interface GameState {
  currentNodeId: string | null
  currentLayer: string
  isInsideBuilding: boolean
  canMove: boolean
}
