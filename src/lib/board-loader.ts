import type { Move, MovesResponse } from "./game-types"
import { ROTATION_MAP } from "./game-config"
import type Phaser from "phaser"

export async function loadBoardData(): Promise<Move[]> {
  try {
    const response = await fetch("/moves.json")
    const data = (await response.json()) as Move[] | MovesResponse

    if (Array.isArray(data)) {
      return data
    } else if (data.moves && Array.isArray(data.moves)) {
      return data.moves
    } else {
      throw new Error("Błędny format danych")
    }
  } catch (error) {
    console.error("Błąd ładowania planszy:", error)
    throw error
  }
}

export function renderBoard(
  scene: Phaser.Scene,
  moves: Move[],
  grid: { size: number; offsetX: number; offsetY: number },
): void {
  moves.forEach(({ move }) => {
    const { row, column } = move.coordinates
    const texture = move.elementDefinitionName
    const rotation = ROTATION_MAP[move.rotation] ?? 0

    const x = grid.offsetX + (column - 1) * grid.size + grid.size / 2
    const y = grid.offsetY + (row - 1) * grid.size + grid.size / 2

    scene.add
      .image(x, y, texture)
      .setDisplaySize(grid.size * 0.985, grid.size * 0.985)
      .setRotation(rotation)
      .setDepth(10)
  })
}
