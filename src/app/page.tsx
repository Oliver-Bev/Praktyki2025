"use client";

import { useEffect, useRef, useState } from "react";
import type Phaser from "phaser";

const tileKeys = [
  "bridge", "buildings", "buildings_metro", "double_turn", "intersection", "parking",
  "partial_intersection", "river", "river_bridge", "river_port", "river_train_bridge",
  "river_walk_bridge", "road", "road_crosswalk", "road_parkings", "road_tunel", "train",
  "train_road_bridge", "train_station", "train_walk_bridge", "turn"
];

const rotationMap: Record<string, number> = {
  ZERO: 0,
  ONE: Math.PI / 2,
  TWO: Math.PI,
  THREE: (3 * Math.PI) / 2,
};

type MoveEntry = {
  move: {
    rotation: keyof typeof rotationMap;
    coordinates: { row: number; column: number };
    elementDefinitionName: string;
  };
};

export default function Home() {
  const gameContainerRef = useRef(null);
  const [sceneInstance, setSceneInstance] = useState<Phaser.Scene | null>(null);
  const [gridInfo, setGridInfo] = useState<{ size: number; offsetX: number; offsetY: number } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadPhaserAndInitGame = async () => {
      const Phaser = await import("phaser");
      const height = window.innerHeight * 0.95;
      const width = height;

      class MyScene extends Phaser.Scene {
        constructor() {
          super("GameScene");
        }

        preload() {
  tileKeys.forEach((key) => {
    this.load.image(key, `/img/${key}.png`);
  });

  this.load.on("complete", () => {
    console.log("Wszystkie obrazki załadowane!");
  });
}


        create() {
          const margin = 50;
          const rows = 11;
          const cols = 11;
          const size = Math.floor((Math.min(width, height) - margin) / cols);
          const gridWidth = size * cols;
          const gridHeight = size * rows;
          const offsetX = margin;
          const offsetY = margin;

          setGridInfo({ size, offsetX, offsetY });

          // Gruba ramka
          this.add.rectangle(
            offsetX + gridWidth / 2,
            offsetY + gridHeight / 2,
            gridWidth + 1,
            gridHeight + 1,
            0x111111
          ).setStrokeStyle(3, 0x666666).setDepth(1);

          // Kolumny (1–11)
          for (let x = 0; x < cols; x++) {
            this.add.text(
              offsetX + x * size + size / 2,
              offsetY - 25,
              (x + 1).toString(),
              {
                fontFamily: "Arial",
                fontSize: "18px",
                color: "#ffffff",
              }
            ).setOrigin(0.5).setDepth(10);
          }

          // Wiersze (A–K)
          for (let y = 0; y < rows; y++) {
            this.add.text(
              offsetX - 25,
              offsetY + y * size + size / 2,
              String.fromCharCode(65 + y),
              {
                fontFamily: "Arial",
                fontSize: "18px",
                color: "#ffffff",
              }
            ).setOrigin(0.5).setDepth(10);
          }

          // Siatka
          for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
              this.add.rectangle(
                offsetX + x * size + size / 2,
                offsetY + y * size + size / 2,
                size,
                size,
                0x000000
              ).setStrokeStyle(0.5, 0xffffff).setDepth(2);
            }
          }

          setSceneInstance(this);
        }
      }

      const config = {
        type: Phaser.AUTO,
        width,
        height,
        backgroundColor: "#000",
        parent: gameContainerRef.current,
        scene: MyScene,
      };

      const game = new Phaser.Game(config);
      return () => game.destroy(true);
    };

    loadPhaserAndInitGame();
  }, []);

 const handleFillGridFromFile = async () => {
  if (!sceneInstance || !gridInfo) {
    console.warn("Scene or grid not ready");
    return;
  }

  try {
    const response = await fetch("/moves.json");
    const data: MoveEntry[] = await response.json();
    const { size, offsetX, offsetY } = gridInfo;

    console.log("Ładowanie kafelków:", data.length);

    data.forEach((entry) => {
      const { row, column } = entry.move.coordinates;
      const key = entry.move.elementDefinitionName;
      const rotation = rotationMap[entry.move.rotation] ?? 0;

      const image = sceneInstance.add.image(
  offsetX + (column - 1) * size + size / 2,
  offsetY + (row - 1) * size + size / 2,
  key
).setDisplaySize(size * 0.97, size * 0.97).setDepth(5);


      image.setRotation(rotation);
    });
  } catch (error) {
    console.error("Błąd ładowania moves.json:", error);
  }
};


  return (
    <div style={{ display: "flex", height: "95vh" }}>
      <div
        ref={gameContainerRef}
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      />
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
        <button style={buttonStyle}>Nowa gra - z generowaniem planszy</button>
        <button style={buttonStyle}>Nowa gra - z budowaniem planszy</button>
        <button style={buttonStyle}>Reset gry</button>
        <button onClick={handleFillGridFromFile} style={buttonStyle}>
          Wypełnij pole gry
        </button>
      </div>
    </div>
  );
}

const buttonStyle = {
  padding: "10px 20px",
  backgroundColor: "#444",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  width: "100%",
};
