import { PAWN_TEXTURES } from "./game-config"
import { parseNodeId } from "./graph-utils"
import type Phaser from "phaser"

export class PawnManager {
  private pawn: Phaser.GameObjects.Image | null = null
  private scene: Phaser.Scene
  private grid: { size: number; offsetX: number; offsetY: number }

  constructor(scene: Phaser.Scene, grid: { size: number; offsetX: number; offsetY: number }) {
    this.scene = scene
    this.grid = grid
  }

  placePawn(nodeId: string): boolean {
    const nodeInfo = parseNodeId(nodeId)
    if (!nodeInfo) {
      console.error("Błędny format ID:", nodeId)
      return false
    }

    const { layer, row, col, quarter, subQuarter } = nodeInfo
    const { size, offsetX, offsetY } = this.grid

    let x = offsetX + (col - 1) * size + size / 2
    let y = offsetY + (row - 1) * size + size / 2

    // Korekta ćwiartki
    if (quarter && quarter !== "null") {
      const shift = size / 4
      switch (quarter) {
        case "TL":
          x -= shift
          y -= shift
          break
        case "TR":
          x += shift
          y -= shift
          break
        case "BL":
          x -= shift
          y += shift
          break
        case "BR":
          x += shift
          y += shift
          break
      }
    }

    // Korekta podćwiartki
    if (subQuarter && subQuarter !== "null") {
      const subShift = size / 8
      switch (subQuarter) {
        case "TL":
          x -= subShift
          y -= subShift
          break
        case "TR":
          x += subShift
          y -= subShift
          break
        case "BL":
          x -= subShift
          y += subShift
          break
        case "BR":
          x += subShift
          y += subShift
          break
      }
    }

    // Usuń istniejący pionek
    if (this.pawn) {
      this.pawn.destroy()
    }

    // Tekstura wg warstwy
    const texture = PAWN_TEXTURES[layer] || "pieszy"

    if (!this.scene.textures.exists(texture)) {
      console.error(`Brak tekstury: ${texture}`)
      return false
    }

    try {
      this.pawn = this.scene.add
        .image(x, y, texture)
        .setDisplaySize(size * 0.5, size * 0.5)
        .setDepth(1000)

      return true
    } catch (error) {
      console.error("Błąd tworzenia pionka:", error)
      return false
    }
  }

  removePawn(): void {
    if (this.pawn) {
      this.pawn.destroy()
      this.pawn = null
    }
  }

  getPawn(): Phaser.GameObjects.Image | null {
    return this.pawn
  }
}
