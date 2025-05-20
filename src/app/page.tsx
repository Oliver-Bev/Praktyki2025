"use client"

import { useEffect, useRef, useState } from "react"
import type Phaser from "phaser"

// --- KONFIGURACJA ---
const tileKeys = [
  "bridge",
  "buildings",
  "buildings_metro",
  "double_turn",
  "intersection",
  "parking",
  "partial_intersection",
  "river",
  "river_bridge",
  "river_port",
  "river_train_bridge",
  "river_walk_bridge",
  "road",
  "road_crosswalk",
  "road_parkings",
  "road_tunel",
  "train",
  "train_road_bridge",
  "train_station",
  "train_walk_bridge",
  "turn",
]

const pawnTextures: Record<string, string> = {
  SIDEWALKS: "pieszy",
  METRO: "pieszy-metro",
  TRACKS: "pieszy-pociag",
  RIVERFERRY: "pieszy-prom",
  RIVERBOAT: "pieszy-prom",
  ROADS: "samochod",
  TUNEL: "samochod-tunel",
  OBJECTS: "samochod-prom",
}

const rotationMap: Record<string, number> = {
  ZERO: 0,
  ONE: Math.PI / 2,
  TWO: Math.PI,
  THREE: (3 * Math.PI) / 2,
}



// --- KOMPONENT ---
export default function Home() {
  const gameContainerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<Phaser.Scene | null>(null)
  const gridRef = useRef<{ size: number; offsetX: number; offsetY: number } | null>(null)
  const pawnRef = useRef<Phaser.GameObjects.Image | null>(null)
  const [gameLoaded, setGameLoaded] = useState(false)
  const [pawnPosition, setPawnPosition] = useState({ row: 6, col: 6 }) // Środek planszy (6,6)
  const [canMove, setCanMove] = useState(false)

  // Funkcja do poruszania pionkiem
  const movePawn = (direction: "up" | "down" | "left" | "right") => {
    if (!canMove) return

    const newPosition = { ...pawnPosition }

    switch (direction) {
      case "up":
        if (newPosition.row > 1) newPosition.row -= 1
        break
      case "down":
        if (newPosition.row < 11) newPosition.row += 1
        break
      case "left":
        if (newPosition.col > 1) newPosition.col -= 1
        break
      case "right":
        if (newPosition.col < 11) newPosition.col += 1
        break
    }

    setPawnPosition(newPosition)

    // Aktualizuj pozycję pionka na planszy
    placePawnAtPosition(newPosition.row, newPosition.col)
  }

  // Funkcja do umieszczania pionka na określonej pozycji
  const placePawnAtPosition = (row: number, col: number) => {
    const scene = sceneRef.current
    const grid = gridRef.current
    if (!scene || !grid) return

    const { size, offsetX, offsetY } = grid
    const x = offsetX + (col - 1) * size + size / 2
    const y = offsetY + (row - 1) * size + size / 2

    if (pawnRef.current) {
      pawnRef.current.setPosition(x, y)
    } else {
      // Jeśli pionek jeszcze nie istnieje, stwórz go
      try {
        pawnRef.current = scene.add
          .image(x, y, "samochod")
          .setDisplaySize(size * 0.5, size * 0.5)
          .setDepth(1000)
      } catch (error) {
        console.error("Błąd podczas dodawania pionka:", error)
      }
    }
  }

  // Funkcja inicjująca pionek na środku planszy
  const initPawnInCenter = () => {
    setCanMove(true)
    placePawnAtPosition(6, 6) // Środek planszy (6,6)
  }

  useEffect(() => {
    const loadPhaserAndInitGame = async () => {
      const Phaser = await import("phaser")
      const height = window.innerHeight * 0.95
      const width = height

      class MyScene extends Phaser.Scene {
        constructor() {
          super("GameScene")
        }

        preload() {
          this.load.on("complete", () => {
            console.log("Wszystkie zasoby załadowane!")
            setGameLoaded(true)
          })

          tileKeys.forEach((key) => {
            this.load.image(key, `/img/${key}.png`)
          })
          Object.values(pawnTextures).forEach((key) => {
            this.load.image(key, `/pionki/${key}.png`)
            console.log(`Ładowanie tekstury: ${key}`)
          })
        }

        create() {
          const margin = 50
          const rows = 11
          const cols = 11
          const size = Math.floor((Math.min(width, height) - margin) / cols)
          const offsetX = margin
          const offsetY = margin

          gridRef.current = { size, offsetX, offsetY }
          sceneRef.current = this

          const gridWidth = size * cols
          const gridHeight = size * rows

          this.add
            .rectangle(offsetX + gridWidth / 2, offsetY + gridHeight / 2, gridWidth, gridHeight)
            .setStrokeStyle(3, 0x666666)

          for (let x = 0; x < cols; x++) {
            this.add
              .text(offsetX + x * size + size / 2, offsetY - 25, (x + 1).toString(), {
                fontFamily: "Arial",
                fontSize: "18px",
                color: "#ffffff",
              })
              .setOrigin(0.5)
          }

          for (let y = 0; y < rows; y++) {
            this.add
              .text(offsetX - 25, offsetY + y * size + size / 2, String.fromCharCode(65 + y), {
                fontFamily: "Arial",
                fontSize: "18px",
                color: "#ffffff",
              })
              .setOrigin(0.5)
          }

          for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
              this.add
                .rectangle(offsetX + x * size + size / 2, offsetY + y * size + size / 2, size, size, 0x000000)
                .setStrokeStyle(0.5, 0xffffff)
            }
          }

          console.log("Dostępne tekstury:", this.textures.list)
        }
      }

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        width,
        height,
        backgroundColor: "#000",
        parent: gameContainerRef.current!,
        scene: MyScene,
      })

      return () => game.destroy(true)
    }

    loadPhaserAndInitGame()
  }, [])

  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp":
          movePawn("up")
          break
        case "ArrowDown":
          movePawn("down")
          break
        case "ArrowLeft":
          movePawn("left")
          break
        case "ArrowRight":
          movePawn("right")
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [canMove, pawnPosition]) 

  const handleFillGridFromFile = async () => {
    const scene = sceneRef.current
    const grid = gridRef.current
    if (!scene || !grid) return

    try {
      const response = await fetch("/moves.json")
      const data = await response.json()

      if (Array.isArray(data)) {
        data.forEach(({ move }) => {
          const { row, column } = move.coordinates
          const texture = move.elementDefinitionName
          const rotation = rotationMap[move.rotation] ?? 0

          const x = grid.offsetX + (column - 1) * grid.size + grid.size / 2
          const y = grid.offsetY + (row - 1) * grid.size + grid.size / 2

     
          scene.add
            .image(x, y, texture)
            .setDisplaySize(grid.size * 0.985, grid.size * 0.985)
            .setRotation(rotation)
            .setDepth(10)
        })
      } else if (data.moves && Array.isArray(data.moves)) {
        data.moves.forEach(({ move }) => {
          const { row, column } = move.coordinates
          const texture = move.elementDefinitionName
          const rotation = rotationMap[move.rotation] ?? 0

          const x = grid.offsetX + (column - 1) * grid.size + grid.size / 2
          const y = grid.offsetY + (row - 1) * grid.size + grid.size / 2

   
          scene.add
            .image(x, y, texture)
            .setDisplaySize(grid.size * 0.985, grid.size * 0.985)
            .setRotation(rotation)
            .setDepth(10)
        })
      } else {
        console.error("Nieprawidłowy format danych:", data)
      }
    } catch (error) {
      console.error("Błąd podczas ładowania pliku moves:", error)
    }
  }



  const placePawnByGraphId = (id: string) => {
    const scene = sceneRef.current
    const grid = gridRef.current
    if (!scene || !grid) {
      console.error("Scena lub grid nie są gotowe")
      return
    }

    console.log("Umieszczanie pionka z ID:", id)

    const parts = id.split("_")
    if (parts.length < 2) {
      console.error("Nieprawidłowy format ID:", id)
      return
    }

    const layer = parts[0]
    const coordPart = parts[1]

    const rowMatch = coordPart.match(/R(\d+)/)
    const colMatch = coordPart.match(/C(\d+)/)

    if (!rowMatch || !colMatch) {
      console.error("Nieprawidłowy format współrzędnych w ID:", coordPart)
      return
    }

    const row = Number.parseInt(rowMatch[1])
    const col = Number.parseInt(colMatch[1])

    const quarter = parts.length > 2 ? parts[2] : null

    const subQuarter = parts.length > 3 ? parts[3] : null

    const { size, offsetX, offsetY } = grid

    let x = offsetX + (col - 1) * size + size / 2
    let y = offsetY + (row - 1) * size + size / 2

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

    if (pawnRef.current) {
      pawnRef.current.destroy()
    }

    const texture = pawnTextures[layer] || "pieszy"
    console.log(`Używam tekstury: ${texture} dla warstwy: ${layer}`)

    if (!scene.textures.exists(texture)) {
      console.error(`Tekstura ${texture} nie istnieje!`)
      console.log("Dostępne tekstury:", Object.keys(scene.textures.list))
      return
    }

    try {
      pawnRef.current = scene.add
        .image(x, y, texture)
        .setDisplaySize(size * 0.5, size * 0.5)
        .setDepth(1000)

      console.log("Pionek dodany pomyślnie:", pawnRef.current)
    } catch (error) {
      console.error("Błąd podczas dodawania pionka:", error)
    }
  }

  return (
    <div style={{ display: "flex", height: "95vh" }}>
      <div ref={gameContainerRef} style={{ flex: 1 }} />
      <div
        style={{
          width: "240px",
          padding: "20px",
          background: "#111",
          color: "#fff",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <button onClick={handleFillGridFromFile} style={buttonStyle}>
          Nowa gra - z generowaniem planszy
        </button>
        <button style={buttonStyle}>Nowa gra - z budowaniem planszy</button>
        <button style={buttonStyle}>Reset gry</button>
        <button onClick={() => placePawnByGraphId("SIDEWALKS_R6C6_TL_null")} style={buttonStyle} disabled={!gameLoaded}>
          Test pionka
        </button>
        <button onClick={initPawnInCenter} style={buttonStyle} disabled={!gameLoaded}>
          Umieść auto na środku
        </button>
        <div style={{ marginTop: "20px", fontSize: "12px", color: "#aaa" }}>
          Status: {gameLoaded ? "Gra gotowa" : "Ładowanie..."}
        </div>
        <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "5px" }}>
          <div></div>
          <button onClick={() => movePawn("up")} style={{ ...buttonStyle, fontSize: "18px" }} disabled={!canMove}>
            ↑
          </button>
          <div></div>

          <button onClick={() => movePawn("left")} style={{ ...buttonStyle, fontSize: "18px" }} disabled={!canMove}>
            ←
          </button>
          <div></div>
          <button onClick={() => movePawn("right")} style={{ ...buttonStyle, fontSize: "18px" }} disabled={!canMove}>
            →
          </button>

          <div></div>
          <button onClick={() => movePawn("down")} style={{ ...buttonStyle, fontSize: "18px" }} disabled={!canMove}>
            ↓
          </button>
          <div></div>
        </div>
      </div>
    </div>
  )
}

const buttonStyle = {
  padding: "10px 20px",
  backgroundColor: "#444",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  width: "100%",
}
