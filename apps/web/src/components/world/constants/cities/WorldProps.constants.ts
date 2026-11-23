// The fixed value WorldProps.tsx works with: where its model comes from.

export const SRC = "/models/world-props.glb";

// In winter the pond's reeds are dried and its cattails darker (the winter prototype's): each colour
// of the reeds' green and of the cattails' brown, [summer, winter], is turned by as much as these
export const DRIED = { reed: ["#769345", "#ac9665"], cattail: ["#8a5a36", "#7d5838"] } as const;
