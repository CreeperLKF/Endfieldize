import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";

const mocks = vi.hoisted(() => ({
  downloadBlob: vi.fn(),
  downloadGif: vi.fn(),
  downloadVideo: vi.fn(),
  exportGif: vi.fn(),
  exportStill: vi.fn(),
  exportVideo: vi.fn(),
  renderStillBlob: vi.fn(),
}));

vi.mock("../lib/exportStill", () => ({
  default: mocks.exportStill,
  downloadBlob: mocks.downloadBlob,
  renderStillBlob: mocks.renderStillBlob,
}));

vi.mock("../lib/exportVideo", () => ({
  downloadVideo: mocks.downloadVideo,
  exportVideo: mocks.exportVideo,
}));

vi.mock("../lib/exportGif", () => ({
  downloadGif: mocks.downloadGif,
  exportGif: mocks.exportGif,
}));

vi.mock("../lib/render", () => ({
  renderComposition: vi.fn(),
}));

class TestImage {
  naturalWidth = 1920;
  naturalHeight = 1080;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

describe("app editor flow", () => {
  beforeEach(() => {
    mocks.downloadBlob.mockReset();
    mocks.downloadGif.mockReset();
    mocks.downloadVideo.mockReset();
    mocks.exportGif.mockReset();
    mocks.exportStill.mockReset();
    mocks.renderStillBlob.mockImplementation(async (_image: HTMLImageElement, _state: unknown, type = "image/png") => new Blob(["still"], { type }));
    mocks.exportGif.mockImplementation(async ({ onProgress }: { onProgress?: (progress: number) => void }) => {
      onProgress?.(1);
      return new Blob(["gif"], { type: "image/gif" });
    });
    mocks.exportVideo.mockImplementation(async ({ onProgress }: { onProgress?: (progress: number) => void }) => {
      onProgress?.(1);
      return new Blob(["motion"], { type: "video/webm" });
    });

    vi.stubGlobal("Image", TestImage);
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:test-image"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("keeps presets in grade, localizes controls, exports gif, and folds livp into advanced export", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.queryByText("00 / PRESET")).toBeNull();
    const titlePreset = screen.getByLabelText("标题预设") as HTMLSelectElement;
    expect(titlePreset.value).toBe("center-cn");
    expect([...titlePreset.options].map((option) => option.value)).toEqual([
      "center-cn",
      "center-cn-en",
      "hud-lower-left",
      "sector-top-left",
      "lower-right",
    ]);

    const titleSection = screen.getByText("03 / 标题").closest(".panel-section") as HTMLElement;
    const titleScale = within(titleSection).getByRole("slider", { name: /缩放/ }) as HTMLInputElement;
    expect(titleScale.min).toBe("0.5");
    expect(titleScale.max).toBe("2.6");

    const gradePreset = screen.getByLabelText("调色预设") as HTMLSelectElement;
    expect([...gradePreset.options].map((option) => option.textContent)).toEqual(["默认", "武陵 1", "武陵 2", "武陵 3", "自定义"]);
    expect(gradePreset.options[4].disabled).toBe(true);

    fireEvent.change(screen.getByRole("slider", { name: /冷色调/ }), { target: { value: "0.8" } });
    expect(gradePreset.value).toBe("custom");

    await user.click(screen.getByText("高级标题"));
    const advancedTitle = screen.getByText("高级标题").closest("details") as HTMLDetailsElement;
    expect(screen.getByLabelText("编号").closest("details")).toBe(advancedTitle);
    expect(screen.getByLabelText("标题颜色").closest("details")).toBe(advancedTitle);

    fireEvent.change(screen.getByLabelText("标题颜色"), { target: { value: "custom" } });
    expect((screen.getByLabelText("自定义颜色") as HTMLInputElement).type).toBe("color");

    await user.click(screen.getByRole("button", { name: "English" }));
    expect(screen.getByRole("button", { name: "English" }).getAttribute("aria-pressed")).toBe("true");
    expect((screen.getByLabelText("Grade preset") as HTMLSelectElement).value).toBe("custom");

    const opacity = screen.getByRole("slider", { name: /Opacity/ }) as HTMLInputElement;
    expect(opacity.min).toBe("0");
    fireEvent.change(opacity, { target: { value: "0" } });
    expect(opacity.value).toBe("0");

    await user.click(screen.getByRole("button", { name: "中文" }));

    const uploadInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(uploadInput, new File(["image"], "sample.png", { type: "image/png" }));
    await waitFor(() => expect(screen.getByText("sample.png")).toBeTruthy());

    const exportSection = screen.getByText("05 / 导出").closest(".panel-section") as HTMLElement;
    expect(within(exportSection).getByText("图片")).toBeTruthy();
    expect(within(exportSection).getByText("视频")).toBeTruthy();
    expect(screen.getByRole("button", { name: "JPG" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "PNG" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "WEBM" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "GIF" })).toBeTruthy();

    const quality = screen.getByLabelText("导出质量") as HTMLSelectElement;
    expect(quality.value).toBe("high");

    expect(screen.getByRole("button", { name: "GIF" })).toBeTruthy();
    const foldedLivpButton = screen.getByRole("button", { name: ".LIVP" });
    const advancedExport = foldedLivpButton.closest("details") as HTMLDetailsElement;
    expect(advancedExport.open).toBe(false);

    await user.click(screen.getByRole("button", { name: "GIF" }));
    await waitFor(() => expect(mocks.downloadGif).toHaveBeenCalledTimes(1));

    const [gifBlob] = mocks.downloadGif.mock.calls[0] as [Blob];
    expect(gifBlob.type).toBe("image/gif");
    expect(mocks.exportGif).toHaveBeenCalledTimes(1);
    expect(mocks.downloadVideo).not.toHaveBeenCalled();
    expect(mocks.downloadBlob).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "JPG" }));
    await waitFor(() => expect(mocks.downloadBlob).toHaveBeenCalledWith(expect.any(Blob), "endfieldize.jpg"));
    expect(mocks.renderStillBlob).toHaveBeenLastCalledWith(expect.any(TestImage), expect.any(Object), "image/jpeg", 0.94);

    await user.click(screen.getByRole("button", { name: "PNG" }));
    await waitFor(() => expect(mocks.downloadBlob).toHaveBeenCalledWith(expect.any(Blob), "endfieldize.png"));
    expect(mocks.renderStillBlob).toHaveBeenLastCalledWith(expect.any(TestImage), expect.any(Object), "image/png", undefined);

    await user.click(screen.getByText("高级导出"));
    await user.click(screen.getByRole("button", { name: ".LIVP" }));
    await waitFor(() => expect(mocks.downloadBlob).toHaveBeenCalledTimes(3));

    const [blob, filename] = mocks.downloadBlob.mock.calls[2] as [Blob, string];
    expect(blob.type).toBe("application/octet-stream");
    expect(filename).toBe("endfieldize.livp");
  });
});
