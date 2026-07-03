import { StrictMode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

type DimensionKey = "widescreen" | "portrait" | "reels" | "landscape" | "square";
type LayerKind = "character" | "text";

type Dimension = {
	key: DimensionKey;
	label: string;
	size: { width: number; height: number };
	backgrounds: string[];
	defaultFont: FontFamily;
};

type FontFamily =
	| "Poppins"
	| "Yeseva One"
	| "Fraunces"
	| "Plus Jakarta Sans"
	| "DM Serif Display"
	| "Fuzzy Bubbles";

type BaseLayer = {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
};

type CharacterLayer = BaseLayer & {
	kind: "character";
	src: string;
	name: string;
};

type TextLayer = BaseLayer & {
	kind: "text";
	text: string;
	fontFamily: FontFamily;
	fontSize: number;
	fontWeight: number;
	color: string;
	align: CanvasTextAlign;
};

type Layer = CharacterLayer | TextLayer;

const dimensions: Dimension[] = [
	{
		key: "widescreen",
		label: "Widescreen",
		size: { width: 1672, height: 941 },
		backgrounds: ["4k (1).png", "4k (2).png", "4k (3).png", "4k (4).png", "4k (5).png"],
		defaultFont: "Poppins",
	},
	{
		key: "portrait",
		label: "Portrait",
		size: { width: 1086, height: 1448 },
		backgrounds: ["portrait (1).png", "portrait (2).png", "portrait (3).png", "portrait (4).png", "portrait (5).png"],
		defaultFont: "Poppins",
	},
	{
		key: "reels",
		label: "Reels",
		size: { width: 941, height: 1672 },
		backgrounds: ["reels (1).png", "reels (2).png", "reels (3).png", "reels (4).png", "reels (5).png"],
		defaultFont: "Poppins",
	},
	{
		key: "landscape",
		label: "Landscape",
		size: { width: 1448, height: 1086 },
		backgrounds: ["landscape (1).png", "landscape (2).png", "landscape (3).png", "landscape (4).png", "landscape (5).png"],
		defaultFont: "Poppins",
	},
	{
		key: "square",
		label: "Square",
		size: { width: 1254, height: 1254 },
		backgrounds: ["square (1).png", "square (2).png", "square (3).png", "square (4).png", "square (5).png"],
		defaultFont: "Poppins",
	},
];

const characters = [
	"announce.png",
	"book-sharing.png",
	"discussion.png",
	"error.png",
	"gathering.png",
	"go.png",
	"gossip.png",
	"group.png",
	"hei.png",
	"javascript.png",
	"laughing.png",
	"learn.png",
	"moving.png",
	"plant.png",
	"puzzle.png",
	"python.png",
	"selfie.png",
	"strategizing.png",
	"surprised.png",
	"teach.png",
	"teamwork.png",
	"together.png",
	"uiux.png",
];

const fonts: FontFamily[] = [
	"Poppins",
	"Yeseva One",
	"Fraunces",
	"Plus Jakarta Sans",
	"DM Serif Display",
	"Fuzzy Bubbles",
];

const textColors = ["#ffe462", "#627dff", "#4a4640", "#161513", "#89867f", "#faf7f2"];

function asset(path: string) {
	return `${import.meta.env.BASE_URL}${path}`;
}

function fontStack(fontFamily: FontFamily) {
	return `"${fontFamily}", ui-sans-serif, system-ui, sans-serif`;
}

function centerLayer(size: Dimension["size"], width: number, height: number) {
	return {
		x: Math.round((size.width - width) / 2),
		y: Math.round((size.height - height) / 2),
		width,
		height,
	};
}

function App() {
	const viewport = useViewportSize();
	const workspaceFitRef = useRef<HTMLDivElement>(null);
	const workspaceFitSize = useElementSize(workspaceFitRef);
	const [dimensionKey, setDimensionKey] = useState<DimensionKey>("widescreen");
	const dimension = dimensions.find((item) => item.key === dimensionKey) ?? dimensions[0];
	const [background, setBackground] = useState(dimension.backgrounds[0]);
	const [layers, setLayers] = useState<Layer[]>([]);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [editingTextId, setEditingTextId] = useState<string | null>(null);
	const [drag, setDrag] = useState<null | {
		id: string;
		mode: "move" | "resize";
		startX: number;
		startY: number;
		layer: Layer;
	}>(null);
	const stageRef = useRef<HTMLDivElement>(null);

	const selectedLayer = layers.find((layer) => layer.id === selectedId) ?? null;
	const draggingLayer = drag ? layers.find((layer) => layer.id === drag.id) : null;
	const backgroundSrc = asset(`background/${dimension.key}/${background}`);
	const guideThreshold = 2;
	const guides =
		drag?.mode === "move" && draggingLayer
			? {
					x: Math.abs(draggingLayer.x + draggingLayer.width / 2 - dimension.size.width / 2) <= guideThreshold,
					y: Math.abs(draggingLayer.y + draggingLayer.height / 2 - dimension.size.height / 2) <= guideThreshold,
				}
			: { x: false, y: false };

	const scale = useMemo(() => {
		const isMobile = viewport.width < 1024;
		const maxWidth = Math.max(260, (workspaceFitSize.width || viewport.width) - (isMobile ? 32 : 64));
		const maxHeight = Math.max(260, isMobile ? viewport.height * 0.68 : viewport.height - 230);
		return Math.min(maxWidth / dimension.size.width, maxHeight / dimension.size.height, 1);
	}, [dimension.size.height, dimension.size.width, viewport.height, viewport.width, workspaceFitSize.width]);

	useEffect(() => {
		setBackground(dimension.backgrounds[0]);
		setLayers([]);
		setSelectedId(null);
		setEditingTextId(null);
	}, [dimensionKey]);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Delete" && event.key !== "Backspace") {
				return;
			}
			const target = event.target as HTMLElement | null;
			if (target?.closest("input, textarea, select")) {
				return;
			}
			setLayers((current) => current.filter((layer) => layer.id !== selectedId));
			setSelectedId(null);
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [selectedId]);

	const updateLayer = useCallback((id: string, patch: Partial<Layer>) => {
		setLayers((current) =>
			current.map((layer) => {
				if (layer.id !== id) {
					return layer;
				}
				const next = { ...layer, ...patch } as Layer;
				return next.kind === "text" ? fitTextLayer(next, dimension.size) : next;
			}),
		);
	}, [dimension.size]);

	const addCharacter = (name: string) => {
		const width = Math.round(dimension.size.width * 0.32);
		const height = width;
		const layer: CharacterLayer = {
			id: crypto.randomUUID(),
			kind: "character",
			src: asset(`character/${name}`),
			name,
			...centerLayer(dimension.size, width, height),
		};
		setLayers((current) => [...current, layer]);
		setSelectedId(layer.id);
	};

	const addText = () => {
		const width = Math.round(dimension.size.width * 0.5);
		const height = Math.round(dimension.size.height * 0.16);
		const layer = fitTextLayer({
			id: crypto.randomUUID(),
			kind: "text",
			text: "Tulis headline di sini",
			fontFamily: dimension.defaultFont,
			fontSize: Math.round(dimension.size.width * 0.055),
			fontWeight: 700,
			color: "#212121",
			align: "center",
			...centerLayer(dimension.size, width, height),
		}, dimension.size);
		setLayers((current) => [...current, layer]);
		setSelectedId(layer.id);
	};

	const startDrag = (event: React.PointerEvent, layer: Layer, mode: "move" | "resize") => {
		event.preventDefault();
		event.stopPropagation();
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		setSelectedId(layer.id);
		setDrag({
			id: layer.id,
			mode,
			startX: event.clientX,
			startY: event.clientY,
			layer,
		});
	};

	const onPointerMove = (event: React.PointerEvent) => {
		if (!drag) {
			return;
		}
		const dx = (event.clientX - drag.startX) / scale;
		const dy = (event.clientY - drag.startY) / scale;
		if (drag.mode === "move") {
			updateLayer(drag.id, {
				x: Math.round(Math.max(-drag.layer.width, Math.min(dimension.size.width, drag.layer.x + dx))),
				y: Math.round(Math.max(-drag.layer.height, Math.min(dimension.size.height, drag.layer.y + dy))),
			});
			return;
		}
		updateLayer(drag.id, {
			width: Math.round(Math.max(60, Math.min(dimension.size.width * 1.6, drag.layer.width + dx))),
			height: Math.round(Math.max(40, Math.min(dimension.size.height * 1.6, drag.layer.height + dy))),
		});
	};

	const moveLayer = (action: "up" | "down" | "front" | "back") => {
		if (!selectedId) {
			return;
		}
		setLayers((current) => {
			const index = current.findIndex((layer) => layer.id === selectedId);
			if (index < 0) {
				return current;
			}
			const next = [...current];
			const [layer] = next.splice(index, 1);
			const target =
				action === "front"
					? next.length
					: action === "back"
						? 0
						: action === "up"
							? Math.min(index + 1, next.length)
							: Math.max(index - 1, 0);
			next.splice(target, 0, layer);
			return next;
		});
	};

	const download = async () => {
		await document.fonts.ready;
		const canvas = document.createElement("canvas");
		canvas.width = dimension.size.width;
		canvas.height = dimension.size.height;
		const context = canvas.getContext("2d");
		if (!context) {
			return;
		}
		const bg = await loadImage(backgroundSrc);
		context.drawImage(bg, 0, 0, canvas.width, canvas.height);
		for (const layer of layers) {
			if (layer.kind === "character") {
				const img = await loadImage(layer.src);
				drawContainedImage(context, img, layer);
			} else {
				drawWrappedText(context, layer);
			}
		}
		const link = document.createElement("a");
		link.download = `manoosia-${dimension.key}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`;
		const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
		if (!blob) {
			return;
		}
		link.href = URL.createObjectURL(blob);
		link.click();
		setTimeout(() => URL.revokeObjectURL(link.href), 1000);
	};

	return (
		<div className="min-h-screen bg-(--user-bg) text-(--user-text)">
			<header className="border-b border-(--user-border) bg-white/90 px-5 py-4 backdrop-blur">
				<div className="flex w-full items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<img className="h-10 w-10 rounded-xl bg-(--app-accent) p-1.5" src={asset("icon_transparent.png")} alt="" />
						<div>
							<p className="text-[10px] font-bold uppercase tracking-[0.16em] text-(--user-subtle)">Manoosia</p>
							<h1 className="text-base font-bold">Content Maker</h1>
						</div>
					</div>
					<button className="btn-primary min-h-10 px-4 py-2 text-xs" type="button" onClick={download} disabled={!background}>
						Download PNG
					</button>
				</div>
			</header>

			<main className="flex h-[calc(100svh-73px)] flex-col gap-4 overflow-hidden px-3 py-3 sm:px-4 sm:py-4 lg:grid lg:h-[calc(100vh-73px)] lg:grid-cols-[280px_minmax(0,1fr)_320px]">
				<details className="mobile-disclosure panel order-2 overflow-hidden lg:order-none" open>
					<summary>Assets</summary>
					<div className="mobile-disclosure-body">
						<Section title="Dimension">
							<div className="grid grid-cols-2 gap-2">
								{dimensions.map((item) => (
									<button
										key={item.key}
										className={item.key === dimension.key ? "choice choice-active" : "choice"}
										type="button"
										onClick={() => setDimensionKey(item.key)}
									>
										<span>{item.label}</span>
										<small>{item.size.width} x {item.size.height}</small>
									</button>
								))}
							</div>
						</Section>

						<Section title="Background">
							<div className="thumb-grid">
								{dimension.backgrounds.map((item) => (
									<button
										key={item}
										className={item === background ? "thumb thumb-active" : "thumb"}
										type="button"
										onClick={() => setBackground(item)}
									>
										<img src={asset(`background/${dimension.key}/${item}`)} alt="" />
									</button>
								))}
							</div>
						</Section>

						<Section title="Characters">
							<div className="thumb-grid">
								{characters.map((item) => (
									<button key={item} className="thumb character-thumb" type="button" onClick={() => addCharacter(item)}>
										<img src={asset(`character/${item}`)} alt="" />
									</button>
								))}
							</div>
						</Section>
					</div>
				</details>

				<section className="workspace-panel order-1 min-w-0 lg:order-none">
					<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
						<div>
							<p className="kicker">Workspace</p>
							<h2 className="text-xl font-bold tracking-[-0.03em]">{dimension.label}</h2>
						</div>
						<div className="flex flex-wrap gap-2">
							<button className="btn-outline min-h-10 px-4 py-2 text-xs" type="button" onClick={addText}>
								Add Text
							</button>
						</div>
					</div>

					<div className="workspace-fit" ref={workspaceFitRef}>
						<div
							ref={stageRef}
							className="relative mx-auto overflow-visible shadow-[0_18px_45px_rgba(15,23,42,0.18)]"
							style={{
								width: dimension.size.width * scale,
								height: dimension.size.height * scale,
							}}
							onPointerMove={onPointerMove}
							onPointerUp={() => setDrag(null)}
							onPointerDown={() => {
								setSelectedId(null);
								setEditingTextId(null);
							}}
						>
							<div className="absolute inset-0 overflow-hidden">
								<img className="h-full w-full select-none object-fill" src={backgroundSrc} alt="" draggable={false} />
							</div>
							{layers.map((layer) => (
								<div
									key={layer.id}
									className={layer.id === selectedId ? "layer layer-selected" : "layer"}
									style={{
										left: layer.x * scale,
										top: layer.y * scale,
										width: layer.width * scale,
										height: layer.height * scale,
									}}
									onPointerDown={(event) => startDrag(event, layer, "move")}
									onDoubleClick={(event) => {
										if (layer.kind !== "text") {
											return;
										}
										event.stopPropagation();
										setSelectedId(layer.id);
										setEditingTextId(layer.id);
									}}
								>
									{layer.kind === "character" ? (
										<img className="h-full w-full select-none object-contain" src={layer.src} alt="" draggable={false} />
									) : editingTextId === layer.id ? (
										<textarea
											autoFocus
											className="h-full w-full resize-none overflow-hidden bg-white/80 p-1 outline-none"
											style={{
												fontFamily: fontStack(layer.fontFamily),
												fontSize: layer.fontSize * scale,
												fontWeight: layer.fontWeight,
												color: layer.color,
												lineHeight: 1.12,
												textAlign: layer.align,
											}}
											value={layer.text}
											onBlur={() => setEditingTextId(null)}
											onChange={(event) => updateLayer(layer.id, { text: event.target.value })}
											onDoubleClick={(event) => event.stopPropagation()}
											onPointerDown={(event) => event.stopPropagation()}
										/>
									) : (
										<div
											className="h-full w-full overflow-hidden whitespace-pre-wrap break-words"
											style={{
												fontFamily: fontStack(layer.fontFamily),
												fontSize: layer.fontSize * scale,
												fontWeight: layer.fontWeight,
												color: layer.color,
												lineHeight: 1.12,
												textAlign: layer.align,
											}}
										>
											{layer.text}
										</div>
									)}
									{layer.id === selectedId ? (
										<button
											aria-label="Resize layer"
											className="resize-handle"
											type="button"
											onPointerDown={(event) => startDrag(event, layer, "resize")}
										/>
									) : null}
								</div>
							))}
							{guides.x ? <div className="align-guide align-guide-x" /> : null}
							{guides.y ? <div className="align-guide align-guide-y" /> : null}
						</div>
					</div>
				</section>

				<details className="mobile-disclosure panel order-3 overflow-hidden lg:order-none" open>
					<summary>Controls</summary>
					<div className="mobile-disclosure-body">
						<div className="mb-4">
							<p className="kicker">Controls</p>
							<h2 className="text-lg font-bold">Layer & Text</h2>
						</div>
						<Section title="Layer">
							<div className="grid grid-cols-2 gap-2">
								<button className="btn-outline-sm" disabled={!selectedLayer} type="button" onClick={() => moveLayer("up")}>Up</button>
								<button className="btn-outline-sm" disabled={!selectedLayer} type="button" onClick={() => moveLayer("down")}>Down</button>
								<button className="btn-outline-sm" disabled={!selectedLayer} type="button" onClick={() => moveLayer("front")}>Front</button>
								<button className="btn-outline-sm" disabled={!selectedLayer} type="button" onClick={() => moveLayer("back")}>Back</button>
								<button
									className="btn-outline-sm col-span-2"
									disabled={!selectedLayer}
									type="button"
									onClick={() => {
										setLayers((current) => current.filter((layer) => layer.id !== selectedId));
										setSelectedId(null);
									}}
								>
									Delete
								</button>
							</div>
						</Section>

						{selectedLayer?.kind === "text" ? (
							<Section title="Text">
								<label className="label-xs">Content</label>
								<textarea
									className="input-sm mt-1 min-h-28"
									value={selectedLayer.text}
									onChange={(event) => updateLayer(selectedLayer.id, { text: event.target.value })}
								/>
								<label className="label-xs mt-3">Font</label>
								<select
									className="input-sm mt-1"
									value={selectedLayer.fontFamily}
									onChange={(event) => updateLayer(selectedLayer.id, { fontFamily: event.target.value as FontFamily })}
								>
									{fonts.map((font) => (
										<option key={font} value={font}>{font}</option>
									))}
								</select>
								<div className="mt-3 grid grid-cols-2 gap-2">
									<label className="label-xs">
										Size
										<input
											className="input-sm mt-1"
											min={16}
											max={180}
											type="number"
											value={selectedLayer.fontSize}
											onChange={(event) => updateLayer(selectedLayer.id, { fontSize: Number(event.target.value) })}
										/>
									</label>
									<label className="label-xs">
										Weight
										<input
											className="input-sm mt-1"
											max={700}
											min={400}
											step={100}
											type="number"
											value={selectedLayer.fontWeight}
											onChange={(event) => updateLayer(selectedLayer.id, { fontWeight: Number(event.target.value) })}
										/>
									</label>
								</div>
								<label className="label-xs mt-3">Color</label>
								<div className="mt-1 grid grid-cols-6 gap-2">
									{textColors.map((color) => (
										<button
											key={color}
											aria-label={`Set text color ${color}`}
											className={selectedLayer.color === color ? "color-swatch color-swatch-active" : "color-swatch"}
											style={{ backgroundColor: color }}
											type="button"
											onClick={() => updateLayer(selectedLayer.id, { color })}
										/>
									))}
								</div>
								<input
									className="mt-1 h-11 w-full rounded-2xl border border-(--app-border) bg-white p-1"
									type="color"
									value={selectedLayer.color}
									onChange={(event) => updateLayer(selectedLayer.id, { color: event.target.value })}
								/>
								<label className="label-xs mt-3">Text Mode</label>
								<div className="mt-1 grid grid-cols-3 gap-2">
									{(["left", "center", "right"] as const).map((align) => (
										<button
											key={align}
											className={selectedLayer.align === align ? "choice choice-active justify-center text-center capitalize" : "choice justify-center text-center capitalize"}
											type="button"
											onClick={() => updateLayer(selectedLayer.id, { align })}
										>
											{align}
										</button>
									))}
								</div>
							</Section>
						) : (
							<p className="rounded-2xl bg-(--user-surface-soft) p-4 text-sm leading-6 text-(--user-muted)">
								Select layer to reorder. Select text layer to edit font and content.
							</p>
						)}
					</div>
				</details>
			</main>
		</div>
	);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<section className="mb-5 last:mb-0">
			<h2 className="mb-3 text-sm font-bold text-(--user-text)">{title}</h2>
			{children}
		</section>
	);
}

function useViewportSize() {
	const [size, setSize] = useState(() => ({
		width: window.innerWidth,
		height: window.innerHeight,
	}));

	useEffect(() => {
		const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, []);

	return size;
}

function useElementSize(ref: React.RefObject<HTMLElement | null>) {
	const [size, setSize] = useState({ width: 0, height: 0 });

	useEffect(() => {
		if (!ref.current) {
			return;
		}
		const observer = new ResizeObserver(([entry]) => {
			setSize({
				width: entry.contentRect.width,
				height: entry.contentRect.height,
			});
		});
		observer.observe(ref.current);
		return () => observer.disconnect();
	}, [ref]);

	return size;
}

function loadImage(src: string) {
	return new Promise<HTMLImageElement>((resolve, reject) => {
		const image = new Image();
		image.crossOrigin = "anonymous";
		image.onload = () => resolve(image);
		image.onerror = reject;
		image.src = src;
	});
}

function drawWrappedText(context: CanvasRenderingContext2D, layer: TextLayer) {
	context.fillStyle = layer.color;
	context.font = `${layer.fontWeight} ${layer.fontSize}px ${fontStack(layer.fontFamily)}`;
	context.textBaseline = "top";
	context.textAlign = layer.align;
	const lineHeight = layer.fontSize * 1.12;
	const textX = layer.align === "left" ? layer.x : layer.align === "right" ? layer.x + layer.width : layer.x + layer.width / 2;
	const lines = wrapText(context, layer.text, layer.width);
	lines.slice(0, Math.floor(layer.height / lineHeight)).forEach((text, index) => {
		context.fillText(text, textX, layer.y + index * lineHeight);
	});
}

function fitTextLayer(layer: TextLayer, size: Dimension["size"]) {
	const canvas = document.createElement("canvas");
	const context = canvas.getContext("2d");
	if (!context) {
		return layer;
	}
	context.font = `${layer.fontWeight} ${layer.fontSize}px ${fontStack(layer.fontFamily)}`;
	const lineHeight = layer.fontSize * 1.12;
	const lines = wrapText(context, layer.text, layer.width);
	const textWidth = Math.max(...lines.map((line) => context.measureText(line).width), 0);
	const width = Math.min(size.width * 1.6, Math.max(60, Math.ceil(textWidth + layer.fontSize * 0.2)));
	const height = Math.min(size.height * 1.6, Math.max(40, Math.ceil(lines.length * lineHeight)));
	return resizeFromCenter(layer, Math.round(width), Math.round(height));
}

function resizeFromCenter<T extends Layer>(layer: T, width: number, height: number): T {
	const centerX = layer.x + layer.width / 2;
	const centerY = layer.y + layer.height / 2;
	return {
		...layer,
		x: Math.round(centerX - width / 2),
		y: Math.round(centerY - height / 2),
		width,
		height,
	};
}

function wrapText(context: CanvasRenderingContext2D, text: string, width: number) {
	const lines: string[] = [];
	for (const paragraph of text.split("\n")) {
		const words = paragraph.split(/\s+/).filter(Boolean);
		let line = "";
		for (const word of words) {
			const test = line ? `${line} ${word}` : word;
			if (context.measureText(test).width <= width || !line) {
				line = test;
			} else {
				lines.push(line);
				line = word;
			}
		}
		lines.push(line);
	}
	return lines;
}

function drawContainedImage(context: CanvasRenderingContext2D, image: HTMLImageElement, layer: CharacterLayer) {
	const scale = Math.min(layer.width / image.naturalWidth, layer.height / image.naturalHeight);
	const width = image.naturalWidth * scale;
	const height = image.naturalHeight * scale;
	context.drawImage(image, layer.x + (layer.width - width) / 2, layer.y + (layer.height - height) / 2, width, height);
}

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
