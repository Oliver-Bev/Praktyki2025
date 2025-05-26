"use client"

import { useEffect, useRef, useState, useCallback } from "react"
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

interface Coordinates {
  row: number
  column: number
}

interface MoveData {
  coordinates: Coordinates
  elementDefinitionName: string
  rotation: string
}

interface Move {
  move: MoveData
}

interface MovesResponse {
  moves?: Move[]
}

// Interfejsy grafu
interface GraphNode {
  id: string
}

interface GraphEdge {
  source: string
  target: string
}

interface Graph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

// --- KOMPONENT ---
export default function Home() {
  const gameContainerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<Phaser.Scene | null>(null)
  const gridRef = useRef<{ size: number; offsetX: number; offsetY: number } | null>(null)
  const pawnRef = useRef<Phaser.GameObjects.Image | null>(null)
  const [gameLoaded, setGameLoaded] = useState(false)
  const [pawnPosition, setPawnPosition] = useState({ row: 6, col: 6 }) // Środek planszy
  const [canMove, setCanMove] = useState(false)
  const [graph, setGraph] = useState<Graph | null>(null)
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null)
  const [isInsideBuilding, setIsInsideBuilding] = useState(false)
  const [currentLayer, setCurrentLayer] = useState<string>("SIDEWALKS")
  const [availableNodes, setAvailableNodes] = useState<string[]>([])
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [bidirectionalGraph, setBidirectionalGraph] = useState<boolean>(true)

  // Dodaj komunikat
  const addDebugMessage = useCallback((message: string) => {
    setDebugInfo((prev) => {
      const newMessages = [message, ...prev]
      return newMessages.slice(0, 10) // Tylko 10 ostatnich
    })
  }, [])

  // Ładuj graf
  useEffect(() => {
    const loadGraph = async () => {
      try {
        const response = await fetch("/graph.json")
        const data = await response.json()
        setGraph(data)
        console.log("Graf załadowany")
        addDebugMessage("Graf załadowany")
      } catch (error) {
        console.error("Błąd grafu:", error)
        addDebugMessage(`Błąd grafu: ${error}`)
      }
    }

    loadGraph()
  }, [addDebugMessage])


  const parseNodeId = useCallback((id: string) => {
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

    const quarter = parts.length > 2 ? parts[2] : null
    const subQuarter = parts.length > 3 ? parts[3] : null

    return { layer, row, col, quarter, subQuarter }
  }, [])

  // Umieść pionek
  const placePawnByGraphId = useCallback(
    (id: string) => {
      const scene = sceneRef.current
      const grid = gridRef.current
      if (!scene || !grid) {
        console.error("Brak sceny/siatki")
        addDebugMessage("Brak sceny/siatki")
        return
      }

      console.log("Umieszczam pionek:", id)
      addDebugMessage(`Umieszczam pionek: ${id}`)

      const nodeInfo = parseNodeId(id)
      if (!nodeInfo) {
        console.error("Błędny format ID:", id)
        addDebugMessage(`Błędny format ID: ${id}`)
        return
      }

      const { layer, row, col, quarter, subQuarter } = nodeInfo
      const { size, offsetX, offsetY } = grid

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

      // Usuń istniejący
      if (pawnRef.current) {
        pawnRef.current.destroy()
      }

      // Tekstura wg warstwy
      const texture = pawnTextures[layer] || "pieszy"
      console.log(`Tekstura: ${texture}, warstwa: ${layer}`)
      addDebugMessage(`Tekstura: ${texture}, warstwa: ${layer}`)

      if (!scene.textures.exists(texture)) {
        console.error(`Brak tekstury: ${texture}`)
        addDebugMessage(`Brak tekstury: ${texture}`)
        console.log("Dostępne tekstury:", Object.keys(scene.textures.list))
        return
      }

      // Nowy pionek
      try {
        pawnRef.current = scene.add
          .image(x, y, texture)
          .setDisplaySize(size * 0.5, size * 0.5)
          .setDepth(1000)

        console.log("Pionek dodany:", pawnRef.current)
        addDebugMessage("Pionek dodany")

        // Aktualizuj warstwę
        setCurrentLayer(layer)
      } catch (error) {
        console.error("Błąd pionka:", error)
        addDebugMessage(`Błąd pionka: ${error}`)
      }
    },
    [parseNodeId, addDebugMessage],
  )

  // Aktualizuj dostępne Ruchy 
  useEffect(() => {
    if (!graph || !currentNodeId) return

    // Pobierz połączone Ruchy 
    let connectedNodes: string[] = []

    // Połączenia wychodzące
    const outgoingEdges = graph.edges.filter((edge) => edge.source === currentNodeId)
    const outgoingNodes = outgoingEdges.map((edge) => edge.target)
    connectedNodes = [...connectedNodes, ...outgoingNodes]

    // Połączenia przychodzące (dwukierunkowe)
    if (bidirectionalGraph) {
      const incomingEdges = graph.edges.filter((edge) => edge.target === currentNodeId)
      const incomingNodes = incomingEdges.map((edge) => edge.source)
      connectedNodes = [...connectedNodes, ...incomingNodes]
    }

    // Usuń duplikaty
    connectedNodes = [...new Set(connectedNodes)]

    setAvailableNodes(connectedNodes)
    console.log("Dostępne Ruchy :", connectedNodes)
    addDebugMessage(`Znaleziono ${connectedNodes.length} ruchów`)
  }, [graph, currentNodeId, bidirectionalGraph, addDebugMessage])

  // Znajdź ruch w kierunku
  const getNodeInDirection = useCallback(
    (direction: "up" | "down" | "left" | "right") => {
      if (!currentNodeId || !availableNodes.length) return null

      // Informacje o bieżącym
      const currentInfo = parseNodeId(currentNodeId)
      if (!currentInfo) return null

      // Filtruj wg kierunku
      const targetNodes = availableNodes.filter((nodeId) => {
        const nodeInfo = parseNodeId(nodeId)
        if (!nodeInfo) return false

        // Ta sama warstwa
        const isSameLayer = nodeInfo.layer === currentLayer

        // Sprawdź kierunek
        switch (direction) {
          case "up":
            return nodeInfo.row < currentInfo.row && isSameLayer
          case "down":
            return nodeInfo.row > currentInfo.row && isSameLayer
          case "left":
            return nodeInfo.col < currentInfo.col && isSameLayer
          case "right":
            return nodeInfo.col > currentInfo.col && isSameLayer
          default:
            return false
        }
      })

      console.log(`Ruchyw kierunku ${direction}:`, targetNodes)
      addDebugMessage(`Znaleziono ${targetNodes.length} w kierunku ${direction}`)
      return targetNodes.length > 0 ? targetNodes[0] : null
    },
    [currentNodeId, availableNodes, currentLayer, parseNodeId, addDebugMessage],
  )

  // Ruch pionka
  const movePawn = useCallback(
    (direction: "up" | "down" | "left" | "right") => {
      if (!canMove || !graph) {
        addDebugMessage(`Brak ruchu: canMove=${canMove}, graph=${!!graph}`)
        return
      }

      const targetNodeId = getNodeInDirection(direction)
      if (targetNodeId) {
        console.log(`Ruch ${direction} do:`, targetNodeId)
        addDebugMessage(`Ruch ${direction} do: ${targetNodeId}`)
        setCurrentNodeId(targetNodeId)

        //aktualizacja wizualna
        placePawnByGraphId(targetNodeId)

        const nodeInfo = parseNodeId(targetNodeId)
        if (nodeInfo) {
          setPawnPosition({ row: nodeInfo.row, col: nodeInfo.col })
        }
      } else {
        console.log(`Brak ruchu w ${direction}`)
        addDebugMessage(`Brak ruchu w ${direction}`)
      }
    },
    [canMove, graph, getNodeInDirection, parseNodeId, placePawnByGraphId, addDebugMessage],
  )

  // Wejście/wyjście z budynku
  const toggleBuilding = useCallback(() => {
    if (!canMove || !currentNodeId || !graph) {
      addDebugMessage("Nie można wejść/wyjść")
      return
    }

    // Połączone Ruchy 
    const connectedNodeIds = availableNodes

    // Filtruj OBJECTS
    const targetNodes = connectedNodeIds.filter((nodeId) =>
      isInsideBuilding ? !nodeId.startsWith("OBJECTS") : nodeId.startsWith("OBJECTS"),
    )

    if (targetNodes.length > 0) {
      // Zmień stan
      setIsInsideBuilding((prev) => !prev)
      console.log(isInsideBuilding ? "Wyjście z budynku" : "Wejście do budynku")
      addDebugMessage(isInsideBuilding ? "Wyjście z budynku" : "Wejście do budynku")

      // Przenieś do pozycji
      const targetNodeId = targetNodes[0]
      setCurrentNodeId(targetNodeId)
      placePawnByGraphId(targetNodeId)

      const nodeInfo = parseNodeId(targetNodeId)
      if (nodeInfo) {
        setPawnPosition({ row: nodeInfo.row, col: nodeInfo.col })
      }
    } else {
      console.log("Brak budynku")
      addDebugMessage("Brak budynku")
    }
  }, [
    canMove,
    currentNodeId,
    graph,
    isInsideBuilding,
    parseNodeId,
    placePawnByGraphId,
    addDebugMessage,
    availableNodes,
  ])

  // Zmiana warstwy
  const changeLayer = useCallback(() => {
    if (!canMove || !currentNodeId || !graph) {
      addDebugMessage("Nie można zmienić warstwy")
      return
    }

    // Połączone Ruchy 
    const connectedNodeIds = availableNodes

    // Znajdź inne warstwy
    const differentLayerNodes = connectedNodeIds.filter((nodeId) => {
      const nodeInfo = parseNodeId(nodeId)
      return nodeInfo && nodeInfo.layer !== currentLayer
    })

    if (differentLayerNodes.length > 0) {
      // Wybierz pierwszy
      const targetNodeId = differentLayerNodes[0]
      const nodeInfo = parseNodeId(targetNodeId)

      if (nodeInfo) {
        console.log(`Zmiana warstwy z ${currentLayer} na ${nodeInfo.layer}`)
        addDebugMessage(`Zmiana warstwy z ${currentLayer} na ${nodeInfo.layer}`)
        setCurrentLayer(nodeInfo.layer)
        setCurrentNodeId(targetNodeId)
        placePawnByGraphId(targetNodeId)
        setPawnPosition({ row: nodeInfo.row, col: nodeInfo.col })
      }
    } else {
      console.log("Brak innych warstw")
      addDebugMessage("Brak innych warstw")
    }
  }, [canMove, currentNodeId, currentLayer, graph, parseNodeId, placePawnByGraphId, addDebugMessage, availableNodes])

  // Losowy start
  const initRandomPawn = useCallback(() => {
    if (!graph || !gameLoaded) {
      addDebugMessage("Nie można zainicjować")
      return
    }

    // Preferowane warstwy
    const preferredLayers = ["SIDEWALKS", "ROADS"]

    let validNodes = graph.nodes.filter((node) => {
      const nodeInfo = parseNodeId(node.id)
      return nodeInfo && preferredLayers.includes(nodeInfo.layer)
    })

    // Alternatywne Ruchy 
    if (validNodes.length === 0) {
      validNodes = graph.nodes.filter((node) => !node.id.startsWith("OBJECTS"))
    }

    if (validNodes.length === 0) {
      console.error("Brak ruchów startowych")
      addDebugMessage("Brak ruchów startowych")
      return
    }

    // Losowy wybór
    const randomIndex = Math.floor(Math.random() * validNodes.length)
    const randomNodeId = validNodes[randomIndex].id

    console.log("Start z pozycji:", randomNodeId)
    addDebugMessage(`Start z pozycji: ${randomNodeId}`)

    // Ustaw ruch i pionek
    setCurrentNodeId(randomNodeId)
    placePawnByGraphId(randomNodeId)

    // Pozycja i warstwa
    const nodeInfo = parseNodeId(randomNodeId)
    if (nodeInfo) {
      setPawnPosition({ row: nodeInfo.row, col: nodeInfo.col })
      setCurrentLayer(nodeInfo.layer)
    }

    setCanMove(true)
    addDebugMessage("Pionek gotowy do ruchu")
  }, [graph, gameLoaded, parseNodeId, placePawnByGraphId, addDebugMessage])

  // Inicjalizacja gry
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
            console.log("Zasoby załadowane")
            setGameLoaded(true)
            addDebugMessage("Zasoby załadowane")
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
          addDebugMessage("Plansza utworzona")
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
  }, [addDebugMessage])

  // Obsługa klawiatury
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!canMove) {
        addDebugMessage("Klawisz zignorowany")
        return
      }

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
        case "o":
        case "O":
          toggleBuilding()
          break
        case "l":
        case "L":
          changeLayer()
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [canMove, movePawn, toggleBuilding, changeLayer, addDebugMessage])

  // Ładuj planszę z pliku
  const handleFillGridFromFile = async () => {
    const scene = sceneRef.current
    const grid = gridRef.current
    if (!scene || !grid) {
      addDebugMessage("Nie można załadować planszy")
      return
    }

    try {
      const response = await fetch("/moves.json")
      const data = (await response.json()) as Move[] | MovesResponse

      if (Array.isArray(data)) {
        data.forEach(({ move }: Move) => {
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
        data.moves.forEach(({ move }: Move) => {
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
        console.error("Błędny format danych")
        addDebugMessage("Błędny format danych")
      }

      addDebugMessage("Plansza wygenerowana")
    } catch (error) {
      console.error("Błąd ładowania planszy:", error)
      addDebugMessage(`Błąd ładowania planszy: ${error}`)
    }
  }

  // Reset gry
  const resetGame = useCallback(() => {
    // Usuń pionek
    if (pawnRef.current) {
      pawnRef.current.destroy()
      pawnRef.current = null
    }

    // Reset stanów
    setCurrentNodeId(null)
    setPawnPosition({ row: 6, col: 6 })
    setCanMove(false)
    setIsInsideBuilding(false)
    setCurrentLayer("SIDEWALKS")
    setAvailableNodes([])
    setDebugInfo(["Gra zresetowana"])

    console.log("Gra zresetowana")
  }, [])



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
          Nowa gra - generuj planszę
        </button>
        <button onClick={initRandomPawn} style={buttonStyle} disabled={!gameLoaded || !graph}>
          Rozpocznij z losowym pionkiem
        </button>
        <button onClick={resetGame} style={buttonStyle}>
          Resetuj grę
        </button>
        <div style={{ marginTop: "20px", fontSize: "12px", color: "#aaa" }}>
          Status: {gameLoaded ? "Gra gotowa" : "Ładowanie..."}
          {gameLoaded && graph ? " | Graf załadowany" : ""}
          {currentNodeId ? ` | ruch: ${currentNodeId}` : ""}
        </div>
        <div style={{ marginTop: "10px", fontSize: "12px", color: "#aaa" }}>
          Warstwa: {currentLayer} | {isInsideBuilding ? "W budynku" : "Na zewnątrz"}
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
        <div style={{ marginTop: "10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px" }}>
          <button onClick={toggleBuilding} style={{ ...buttonStyle }} disabled={!canMove}>
            Wejdź/Wyjdź (O)
          </button>
          <button onClick={changeLayer} style={{ ...buttonStyle }} disabled={!canMove}>
            Zmień warstwę (L)
          </button>
        </div>
        <div
          style={{
            marginTop: "10px",
            fontSize: "12px",
            color: "#aaa",
            textAlign: "left",
            maxHeight: "100px",
            overflowY: "auto",
            border: "1px solid #333",
            padding: "5px",
          }}
        >
          <div>ruch: {currentNodeId || "Brak"}</div>
          <div>Warstwa: {currentLayer}</div>
          <div>
            Pozycja: Wiersz {pawnPosition.row}, Kol {pawnPosition.col}
          </div>
          <div>W budynku: {isInsideBuilding ? "Tak" : "Nie"}</div>
          <div>Możliwość ruchu: {canMove ? "Tak" : "Nie"}</div>
          <div>Dostępne Ruchy : {availableNodes.length}</div>
        </div>
        <div
          style={{
            marginTop: "10px",
            fontSize: "12px",
            color: "#aaa",
            textAlign: "left",
            maxHeight: "150px",
            overflowY: "auto",
            border: "1px solid #333",
            padding: "5px",
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "5px" }}>Dziennik debugowania:</div>
          {debugInfo.map((msg, i) => (
            <div key={i} style={{ marginBottom: "2px" }}>
              {msg}
            </div>
          ))}
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
