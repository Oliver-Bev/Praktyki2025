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

export default function Home() {
  const gameContainerRef = useRef(null);
  const [sceneInstance, setSceneInstance] = useState<Phaser.Scene | null>(null);
  const [gridInfo, setGridInfo] = useState<{ size: number; offsetX: number; offsetY: number } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadPhaserAndInitGame = async () => {
      const Phaser = await import("phaser");
      const height = window.innerHeight * 0.9;
      const width = height;

      class MyScene extends Phaser.Scene {
        constructor() {
          super("GameScene");
        }

        preload() {
          tileKeys.forEach((key) => {
            this.load.image(key, `/img/${key}.png`);
          });
        }

        create() {
          const rows = 11;
          const cols = 11;
          const size = Math.floor(Math.min(width, height) / cols);
          const gridWidth = size * cols;
          const gridHeight = size * rows;
          const offsetX = (width - gridWidth) / 2;
          const offsetY = (height - gridHeight) / 2;

          // Zapamiętaj info o siatce
          setGridInfo({ size, offsetX, offsetY });

          // Rysuj siatkę
          for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
              this.add.rectangle(
                offsetX + x * size + size / 2,
                offsetY + y * size + size / 2,
                size,
                size,
                0x000000
              ).setStrokeStyle(1, 0xffffff);
            }
          }

          setSceneInstance(this);
        }
      }

      const config = {
        type: Phaser.AUTO,
        width,
        height,
        backgroundColor: "#1a1a1a",
        parent: gameContainerRef.current,
        scene: MyScene,
      };

      const game = new Phaser.Game(config);
      return () => game.destroy(true);
    };

    loadPhaserAndInitGame();
  }, []);

  const handleFillGridFromFile = async () => {
    if (!sceneInstance || !gridInfo) return;

    const response = await fetch("/moves.json");
    const data = await response.json();

    const { size, offsetX, offsetY } = gridInfo;

    data.forEach((entry: any) => {
      const { row, column } = entry.move.coordinates;
      const key = entry.move.elementDefinitionName;
      const rotation = rotationMap[entry.move.rotation] ?? 0;

      const image = sceneInstance.add.image(
        offsetX + (column - 1) * size + size / 2,
        offsetY + (row - 1) * size + size / 2,
        key
      ).setDisplaySize(size * 0.95, size * 0.95);

      image.setRotation(rotation);
    });
  };

  return (
    <div style={{ display: "flex", height: "90vh" }}>
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
          width: "220px",
          padding: "20px",
          background: "#222",
          color: "#fff",
          textAlign: "center",
        }}
      >
        <button
          onClick={handleFillGridFromFile}
          style={{
            padding: "10px 20px",
            backgroundColor: "#444",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            width: "100%",
          }}
        >
          Wypełnij pole gry
        </button>
      </div>
    </div>
  );
}
