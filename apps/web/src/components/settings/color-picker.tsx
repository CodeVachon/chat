"use client";

import { useCallback, useMemo, useState } from "react";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
    value: string;
    onChange: (color: string) => void;
}

const presets = [
    { name: "Blue", hue: 222 },
    { name: "Purple", hue: 280 },
    { name: "Green", hue: 145 },
    { name: "Red", hue: 25 },
    { name: "Orange", hue: 55 },
    { name: "Teal", hue: 185 },
    { name: "Pink", hue: 340 }
];

function parseOklch(color: string): { l: number; c: number; h: number } {
    const match = color.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/);
    if (!match) return { l: 0.61, c: 0.11, h: 222 };
    return { l: parseFloat(match[1]), c: parseFloat(match[2]), h: parseFloat(match[3]) };
}

function toOklch(l: number, c: number, h: number): string {
    return `oklch(${l.toFixed(2)} ${c.toFixed(2)} ${h})`;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
    const parsed = useMemo(() => parseOklch(value), [value]);
    const [lightness, setLightness] = useState(parsed.l);
    const [chroma, setChroma] = useState(parsed.c);
    const [hue, setHue] = useState(parsed.h);

    const currentColor = useMemo(() => toOklch(lightness, chroma, hue), [lightness, chroma, hue]);

    const handleChange = useCallback(
        (l: number, c: number, h: number) => {
            onChange(toOklch(l, c, h));
        },
        [onChange]
    );

    const handleHue = useCallback(
        (value: number | readonly number[]) => {
            const h = Array.isArray(value) ? value[0] : value;
            setHue(h);
            handleChange(lightness, chroma, h);
        },
        [lightness, chroma, handleChange]
    );

    const handleChroma = useCallback(
        (value: number | readonly number[]) => {
            const c = Array.isArray(value) ? value[0] : value;
            setChroma(c);
            handleChange(lightness, c, hue);
        },
        [lightness, hue, handleChange]
    );

    const handleLightness = useCallback(
        (value: number | readonly number[]) => {
            const l = Array.isArray(value) ? value[0] : value;
            setLightness(l);
            handleChange(l, chroma, hue);
        },
        [chroma, hue, handleChange]
    );

    const handlePreset = useCallback(
        (presetHue: number) => {
            setHue(presetHue);
            handleChange(lightness, chroma, presetHue);
        },
        [lightness, chroma, handleChange]
    );

    return (
        <div className="space-y-4">
            {/* Preview swatch */}
            <div className="flex items-center gap-3">
                <div
                    className="h-10 w-10 rounded-lg border shadow-sm"
                    style={{ backgroundColor: currentColor }}
                />
                <code className="text-muted-foreground text-sm">{currentColor}</code>
            </div>

            {/* Hue slider */}
            <div className="space-y-2">
                <Label className="text-xs">Hue</Label>
                <div
                    className="rounded-full p-0.5"
                    style={{
                        background:
                            "linear-gradient(to right, oklch(0.65 0.15 0), oklch(0.65 0.15 60), oklch(0.65 0.15 120), oklch(0.65 0.15 180), oklch(0.65 0.15 240), oklch(0.65 0.15 300), oklch(0.65 0.15 360))"
                    }}
                >
                    <Slider value={[hue]} onValueChange={handleHue} min={0} max={360} step={1} />
                </div>
            </div>

            {/* Chroma slider */}
            <div className="space-y-2">
                <Label className="text-xs">Saturation</Label>
                <div
                    className="rounded-full p-0.5"
                    style={{
                        background: `linear-gradient(to right, oklch(${lightness} 0 ${hue}), oklch(${lightness} 0.4 ${hue}))`
                    }}
                >
                    <Slider
                        value={[chroma]}
                        onValueChange={handleChroma}
                        min={0}
                        max={0.4}
                        step={0.01}
                    />
                </div>
            </div>

            {/* Lightness slider */}
            <div className="space-y-2">
                <Label className="text-xs">Lightness</Label>
                <div
                    className="rounded-full p-0.5"
                    style={{
                        background: `linear-gradient(to right, oklch(0.3 ${chroma} ${hue}), oklch(0.8 ${chroma} ${hue}))`
                    }}
                >
                    <Slider
                        value={[lightness]}
                        onValueChange={handleLightness}
                        min={0.3}
                        max={0.8}
                        step={0.01}
                    />
                </div>
            </div>

            {/* Presets */}
            <div className="space-y-2">
                <Label className="text-xs">Presets</Label>
                <div className="flex flex-wrap gap-2">
                    {presets.map((preset) => (
                        <button
                            key={preset.name}
                            type="button"
                            onClick={() => handlePreset(preset.hue)}
                            className={cn(
                                "h-8 w-8 rounded-full border-2 shadow-sm transition-transform hover:scale-110",
                                hue === preset.hue
                                    ? "border-foreground scale-110"
                                    : "border-transparent"
                            )}
                            style={{
                                backgroundColor: `oklch(${lightness} ${chroma} ${preset.hue})`
                            }}
                            title={preset.name}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
