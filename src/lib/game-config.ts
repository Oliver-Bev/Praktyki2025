export const TILE_KEYS = [
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

export const PAWN_TEXTURES: Record<string, string> = {
  SIDEWALKS: "pieszy",
  METRO: "pieszy-metro",
  TRACKS: "pieszy-pociag",
  RIVERFERRY: "samochod-prom",
  RIVERBOAT: "pieszy-prom",
  ROADS: "samochod",
  TUNEL: "samochod-tunel",
  OBJECTS: "dom",
}

export const ROTATION_MAP: Record<string, number> = {
  ZERO: 0,
  ONE: Math.PI / 2,
  TWO: Math.PI,
  THREE: (3 * Math.PI) / 2,
}

export const GAME_CONFIG = {
  GRID_SIZE: 11,
  MARGIN: 50,
  DEFAULT_LAYER: "SIDEWALKS",
}
