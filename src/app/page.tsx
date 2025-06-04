"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type Phaser from "phaser"
import type { Graph, GameState } from "../lib/game-types"
import { TILE_KEYS, PAWN_TEXTURES, GAME_CONFIG } from "../lib/game-config"
import { parseNodeId, getConnectedNodes, getRandomNode, getNodeInDirection } from "../lib/graph-utils"
import { loadBoardData, renderBoard } from "../lib/board-loader"
import { PawnManager } from "../lib/pawn-manager"

export default function Game() {
  const gameContainerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<Phaser.Scene | null>(null)
  const gridRef = useRef<{ size: number; offsetX: number; offsetY: number } | null>(null)
  const pawnManagerRef = useRef<PawnManager | null>(null)

  const [gameLoaded, setGameLoaded] = useState(false)
  const [graph, setGraph] = useState<Graph | null>(null)
  const [gameState, setGameState] = useState<GameState>({
    currentNodeId: null,
    currentLayer: GAME_CONFIG.DEFAULT_LAYER,
    isInsideBuilding: false,
    canMove: false,
  })
  const [gameMessage, setGameMessage] = useState<string>("")
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  // Dodaj komunikat debugowania
  const addDebugMessage = useCallback((message: string) => {
    setDebugInfo((prev) => [message, ...prev].slice(0, 10))
  }, [])

  // Pokaż komunikat gry
  const showGameMessage = useCallback(
    (message: string) => {
      setGameMessage(message)
      addDebugMessage(message)
      setTimeout(() => setGameMessage(""), 3000)
    },
    [addDebugMessage],
  )

  // Ładuj graf
  useEffect(() => {
    const loadGraph = async () => {
      try {
        const response = await fetch("/graph.json")
        const data = await response.json()
        setGraph(data)
        addDebugMessage("Graf załadowany")
      } catch (error) {
        console.error("Błąd grafu:", error)
        addDebugMessage(`Błąd grafu: ${error}`)
      }
    }
    loadGraph()
  }, [addDebugMessage])

  // Inicjalizacja gry
  useEffect(() => {
    const initGame = async () => {
      const Phaser = await import("phaser")
      const height = window.innerHeight * 0.95
      const width = height

      class GameScene extends Phaser.Scene {
        constructor() {
          super("GameScene")
        }

        preload() {
          this.load.on("complete", () => {
            setGameLoaded(true)
            addDebugMessage("Zasoby załadowane")
          })

          TILE_KEYS.forEach((key) => {
            this.load.image(key, `/img/${key}.png`)
          })

          Object.values(PAWN_TEXTURES).forEach((key) => {
            this.load.image(key, `/pionki/${key}.png`)
          })
        }

        create() {
          const { GRID_SIZE, MARGIN } = GAME_CONFIG
          const size = Math.floor((Math.min(width, height) - MARGIN) / GRID_SIZE)
          const offsetX = MARGIN
          const offsetY = MARGIN

          gridRef.current = { size, offsetX, offsetY }
          sceneRef.current = this
          pawnManagerRef.current = new PawnManager(this, { size, offsetX, offsetY })

          const gridWidth = size * GRID_SIZE
          const gridHeight = size * GRID_SIZE

          // Ramka planszy
          this.add
            .rectangle(offsetX + gridWidth / 2, offsetY + gridHeight / 2, gridWidth, gridHeight)
            .setStrokeStyle(3, 0x666666)

          // Etykiety kolumn
          for (let x = 0; x < GRID_SIZE; x++) {
            this.add
              .text(offsetX + x * size + size / 2, offsetY - 25, (x + 1).toString(), {
                fontFamily: "Arial",
                fontSize: "18px",
                color: "#ffffff",
              })
              .setOrigin(0.5)
          }

          // Etykiety wierszy
          for (let y = 0; y < GRID_SIZE; y++) {
            this.add
              .text(offsetX - 25, offsetY + y * size + size / 2, String.fromCharCode(65 + y), {
                fontFamily: "Arial",
                fontSize: "18px",
                color: "#ffffff",
              })
              .setOrigin(0.5)
          }

          // Siatka
          for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
              this.add
                .rectangle(offsetX + x * size + size / 2, offsetY + y * size + size / 2, size, size, 0x000000)
                .setStrokeStyle(0.5, 0xffffff)
            }
          }

          addDebugMessage("Plansza utworzona")
        }
      }

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        width,
        height,
        backgroundColor: "#000",
        parent: gameContainerRef.current!,
        scene: GameScene,
      })

      return () => game.destroy(true)
    }

    initGame()
  }, [addDebugMessage])

  // Nowa gra
  const startNewGame = useCallback(async () => {
    if (!gameLoaded || !graph || !sceneRef.current || !gridRef.current || !pawnManagerRef.current) {
      addDebugMessage("Gra nie jest gotowa")
      return
    }

    try {
      // Załaduj i wyrenderuj planszę
      const moves = await loadBoardData()
      renderBoard(sceneRef.current, moves, gridRef.current)
      addDebugMessage("Plansza wygenerowana")

      // Losowy start z dowolnego węzła
      const randomNodeId = getRandomNode(graph)
      const nodeInfo = parseNodeId(randomNodeId)

      if (nodeInfo && pawnManagerRef.current.placePawn(randomNodeId)) {
        setGameState({
          currentNodeId: randomNodeId,
          currentLayer: nodeInfo.layer,
          isInsideBuilding: nodeInfo.layer === "OBJECTS",
          canMove: true,
        })

        addDebugMessage(`Start z pozycji: ${randomNodeId}`)
        showGameMessage(`🎮 Nowa gra rozpoczęta! Warstwa: ${nodeInfo.layer}`)
      } else {
        addDebugMessage("Błąd umieszczania pionka")
      }
    } catch (error) {
      addDebugMessage(`Błąd nowej gry: ${error}`)
    }
  }, [gameLoaded, graph, addDebugMessage, showGameMessage])

  // Ruch pionka
  const movePawn = useCallback(
    (direction: "up" | "down" | "left" | "right") => {
      if (!gameState.canMove || !graph || !gameState.currentNodeId || !pawnManagerRef.current) {
        addDebugMessage("Brak możliwości ruchu")
        return
      }

      const targetNodeId = getNodeInDirection(graph, gameState.currentNodeId, direction, gameState.currentLayer)

      if (targetNodeId) {
        const currentInfo = parseNodeId(gameState.currentNodeId)
        const targetInfo = parseNodeId(targetNodeId)

        if (currentInfo && targetInfo && pawnManagerRef.current.placePawn(targetNodeId)) {
          // Sprawdź zmianę warstwy
          if (currentInfo.layer !== targetInfo.layer) {
            showGameMessage(`Zmiana warstwy: ${currentInfo.layer} → ${targetInfo.layer}`)
          }

          setGameState((prev) => ({
            ...prev,
            currentNodeId: targetNodeId,
            currentLayer: targetInfo.layer,
            isInsideBuilding: targetInfo.layer === "OBJECTS",
          }))

          addDebugMessage(`Ruch ${direction} do: ${targetNodeId}`)
        }
      } else {
        addDebugMessage(`Brak ruchu w kierunku ${direction}`)
      }
    },
    [gameState, graph, addDebugMessage, showGameMessage],
  )

  // Wejście/wyjście z budynku
  const toggleBuilding = useCallback(() => {
    if (!gameState.canMove || !gameState.currentNodeId || !graph || !pawnManagerRef.current) {
      addDebugMessage("Nie można wejść/wyjść")
      return
    }

    const connectedNodes = getConnectedNodes(graph, gameState.currentNodeId)
    const buildingNodes = connectedNodes.filter((nodeId) => nodeId.startsWith("OBJECTS"))
    const outsideNodes = connectedNodes.filter((nodeId) => !nodeId.startsWith("OBJECTS"))

    const targetNodes = gameState.isInsideBuilding ? outsideNodes : buildingNodes

    if (targetNodes.length > 0) {
      const targetNodeId = targetNodes[0]
      const nodeInfo = parseNodeId(targetNodeId)

      if (nodeInfo && pawnManagerRef.current.placePawn(targetNodeId)) {
        const newInsideState = !gameState.isInsideBuilding

        setGameState((prev) => ({
          ...prev,
          currentNodeId: targetNodeId,
          currentLayer: nodeInfo.layer,
          isInsideBuilding: newInsideState,
        }))

        showGameMessage(newInsideState ? "🏢 Wejście do budynku" : "🚶 Wyjście z budynku")
        addDebugMessage(newInsideState ? "Wejście do budynku" : "Wyjście z budynku")
      }
    } else {
      const message = gameState.isInsideBuilding ? "Brak wyjścia z budynku" : "Brak budynku w pobliżu"
      showGameMessage(message)
      addDebugMessage(message)
    }
  }, [gameState, graph, addDebugMessage, showGameMessage])

  // Zmiana warstwy
  const changeLayer = useCallback(() => {
    if (!gameState.canMove || !gameState.currentNodeId || !graph || !pawnManagerRef.current) {
      addDebugMessage("Nie można zmienić warstwy")
      return
    }

    const connectedNodes = getConnectedNodes(graph, gameState.currentNodeId)
    const differentLayerNodes = connectedNodes.filter((nodeId) => {
      const nodeInfo = parseNodeId(nodeId)
      return nodeInfo && nodeInfo.layer !== gameState.currentLayer
    })

    if (differentLayerNodes.length > 0) {
      const targetNodeId = differentLayerNodes[0]
      const nodeInfo = parseNodeId(targetNodeId)

      if (nodeInfo && pawnManagerRef.current.placePawn(targetNodeId)) {
        setGameState((prev) => ({
          ...prev,
          currentNodeId: targetNodeId,
          currentLayer: nodeInfo.layer,
          isInsideBuilding: nodeInfo.layer === "OBJECTS",
        }))

        showGameMessage(`Zmiana warstwy: ${gameState.currentLayer} → ${nodeInfo.layer}`)
        addDebugMessage(`Zmiana warstwy: ${gameState.currentLayer} → ${nodeInfo.layer}`)
      }
    } else {
      const message = "Brak innych warstw"
      showGameMessage(message)
      addDebugMessage(message)
    }
  }, [gameState, graph, addDebugMessage, showGameMessage])

  // Obsługa klawiatury
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameState.canMove) return

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault()
          movePawn("up")
          break
        case "ArrowDown":
          e.preventDefault()
          movePawn("down")
          break
        case "ArrowLeft":
          e.preventDefault()
          movePawn("left")
          break
        case "ArrowRight":
          e.preventDefault()
          movePawn("right")
          break
        case "o":
        case "O":
          e.preventDefault()
          toggleBuilding()
          break
        case "l":
        case "L":
          e.preventDefault()
          changeLayer()
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [gameState.canMove, movePawn, toggleBuilding, changeLayer])

  const buttonStyle = {
    padding: "12px 24px",
    backgroundColor: "#4f46e5",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "600",
    width: "100%",
    transition: "background-color 0.2s",
  }

  return (
    <div style={{ display: "flex", height: "95vh" }}>
      <div ref={gameContainerRef} style={{ flex: 1, position: "relative" }}>
        {gameMessage && (
          <div
            style={{
              position: "absolute",
              top: "20px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(0, 0, 0, 0.9)",
              color: "#fff",
              padding: "12px 24px",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "bold",
              zIndex: 1000,
              border: "2px solid #4f46e5",
            }}
          >
            {gameMessage}
          </div>
        )}
      </div>

      <div
        style={{
          width: "280px",
          padding: "20px",
          background: "#111",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <button onClick={startNewGame} style={buttonStyle} disabled={!gameLoaded || !graph}>
          🎮 Nowa gra
        </button>

        <div style={{ fontSize: "12px", color: "#aaa" }}>
          Status: {gameLoaded ? "✅ Gra gotowa" : "⏳ Ładowanie..."}
          {gameLoaded && graph ? " | Graf załadowany" : ""}
        </div>

        {gameState.currentNodeId && (
          <div
            style={{ fontSize: "12px", color: "#aaa", padding: "12px", border: "1px solid #333", borderRadius: "6px" }}
          >
            <div>
              <strong>Węzeł:</strong> {gameState.currentNodeId}
            </div>
            <div>
              <strong>Warstwa:</strong> {gameState.currentLayer}
            </div>
            <div>
              <strong>W budynku:</strong> {gameState.isInsideBuilding ? "Tak" : "Nie"}
            </div>
            <div>
              <strong>Możliwość ruchu:</strong> {gameState.canMove ? "Tak" : "Nie"}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
          <div></div>
          <button
            onClick={() => movePawn("up")}
            style={{ ...buttonStyle, fontSize: "18px", padding: "8px" }}
            disabled={!gameState.canMove}
          >
            ↑
          </button>
          <div></div>

          <button
            onClick={() => movePawn("left")}
            style={{ ...buttonStyle, fontSize: "18px", padding: "8px" }}
            disabled={!gameState.canMove}
          >
            ←
          </button>
          <div></div>
          <button
            onClick={() => movePawn("right")}
            style={{ ...buttonStyle, fontSize: "18px", padding: "8px" }}
            disabled={!gameState.canMove}
          >
            →
          </button>

          <div></div>
          <button
            onClick={() => movePawn("down")}
            style={{ ...buttonStyle, fontSize: "18px", padding: "8px" }}
            disabled={!gameState.canMove}
          >
            ↓
          </button>
          <div></div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <button
            onClick={toggleBuilding}
            style={{ ...buttonStyle, fontSize: "14px", padding: "8px" }}
            disabled={!gameState.canMove}
          >
            🏢 Budynek (O)
          </button>
          <button
            onClick={changeLayer}
            style={{ ...buttonStyle, fontSize: "14px", padding: "8px" }}
            disabled={!gameState.canMove}
          >
            🔄 Warstwa (L)
          </button>
        </div>

        <div
          style={{
            fontSize: "11px",
            color: "#666",
            padding: "12px",
            border: "1px solid #333",
            borderRadius: "6px",
            maxHeight: "120px",
            overflowY: "auto",
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "8px" }}>📝 Dziennik:</div>
          {debugInfo.map((msg, i) => (
            <div key={i} style={{ marginBottom: "4px" }}>
              {msg}
            </div>
          ))}
        </div>

        <div style={{ fontSize: "11px", color: "#666" }}>
          <div>
            <strong>Sterowanie:</strong>
          </div>
          <div>• Strzałki - ruch</div>
          <div>• O - wejście/wyjście z budynku</div>
          <div>• L - zmiana warstwy</div>
        </div>
      </div>
    </div>
  )
}
