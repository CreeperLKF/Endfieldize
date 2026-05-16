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
  renderComposition: vi.fn(),
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
  renderComposition: mocks.renderComposition,
}));

class TestImage {
  static nextNaturalWidth = 1920;
  static nextNaturalHeight = 1080;

  naturalWidth = TestImage.nextNaturalWidth;
  naturalHeight = TestImage.nextNaturalHeight;
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
    mocks.renderComposition.mockReset();
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
    TestImage.nextNaturalWidth = 1920;
    TestImage.nextNaturalHeight = 1080;
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

  it("keeps presets in grade, localizes controls, enables gif, and folds webm and livp into advanced export", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole("link", { name: "CreeperLKF/Endfieldize" }).getAttribute("href")).toBe(
      "https://github.com/CreeperLKF/Endfieldize",
    );
    expect(screen.getByRole("link", { name: "骆驼肉" }).getAttribute("href")).toBe("https://www.bilibili.com/video/BV19WwqzEEUk");
    expect(screen.getByRole("link", { name: "京ICP备2024091870号-1" }).getAttribute("href")).toBe("https://beian.miit.gov.cn/");

    expect(screen.queryByText("00 / PRESET")).toBeNull();
    const titlePreset = screen.getByLabelText("标题预设") as HTMLSelectElement;
    expect(titlePreset.value).toBe("center-cn-en");
    expect([...titlePreset.options].map((option) => option.value)).toEqual([
      "center-cn-en",
      "center-cn",
      "hud-lower-left",
      "sector-top-left",
      "lower-right",
    ]);

    const titleSection = screen.getByText("03 / 标题").closest(".panel-section") as HTMLElement;
    const titleScale = within(titleSection).getByRole("slider", { name: /缩放/ }) as HTMLInputElement;
    expect(titleScale.min).toBe("0.5");
    expect(titleScale.max).toBe("2.6");
    const subtitleLabel = within(titleSection).getByText("副标题");
    const codeLabel = within(titleSection).getByText("编号");
    expect(
      Boolean(subtitleLabel.compareDocumentPosition(codeLabel) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true);
    expect(screen.getByLabelText("编号").closest("details")).toBeNull();

    const gradePreset = screen.getByLabelText("调色预设") as HTMLSelectElement;
    expect([...gradePreset.options].map((option) => option.textContent)).toEqual(["默认", "武陵 1", "武陵 2", "武陵 3", "自定义"]);
    expect(gradePreset.options[4].disabled).toBe(true);

    fireEvent.change(screen.getByRole("slider", { name: /冷色调/ }), { target: { value: "0.8" } });
    expect(gradePreset.value).toBe("custom");

    await user.click(screen.getByText("高级标题"));
    const advancedTitle = screen.getByText("高级标题").closest("details") as HTMLDetailsElement;
    expect(screen.getByLabelText("标题颜色").closest("details")).toBe(advancedTitle);
    const tracking = within(advancedTitle).getByRole("slider", { name: /字距/ }) as HTMLInputElement;
    expect(tracking.value).toBe("0.15");
    expect(tracking.max).toBe("0.5");

    fireEvent.change(screen.getByLabelText("标题颜色"), { target: { value: "custom" } });
    expect((screen.getByLabelText("自定义颜色") as HTMLInputElement).type).toBe("color");

    await user.click(screen.getByRole("button", { name: "English" }));
    expect(screen.getByRole("button", { name: "English" }).getAttribute("aria-pressed")).toBe("true");
    expect((screen.getByLabelText("Grade preset") as HTMLSelectElement).value).toBe("custom");
    expect(screen.getByText("Small for GIF, High for others")).toBeTruthy();

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
    expect(screen.getByRole("button", { name: "JPG 压缩" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "PNG 无损" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "MP4" })).toBeTruthy();
    expect((screen.getByRole("button", { name: "GIF" }) as HTMLButtonElement).disabled).toBe(false);

    const quality = screen.getByLabelText("导出质量") as HTMLSelectElement;
    expect(quality.value).toBe("high");
    expect(within(exportSection).getByText("GIF 推荐小，其它推荐高质量")).toBeTruthy();

    const foldedWebmButton = screen.getByRole("button", { name: "WEBM", hidden: true });
    const foldedLivpButton = screen.getByRole("button", { name: ".LIVP" });
    const advancedExport = foldedWebmButton.closest("details") as HTMLDetailsElement;
    expect(foldedLivpButton.closest("details")).toBe(advancedExport);
    expect(advancedExport.open).toBe(false);

    await user.click(screen.getByRole("button", { name: "GIF" }));
    await waitFor(() => expect(mocks.downloadGif).toHaveBeenCalledWith(expect.any(Blob), "endfieldize.gif"));
    expect(mocks.exportGif).toHaveBeenCalledWith(expect.objectContaining({ image: expect.any(TestImage) }));
    expect(mocks.downloadVideo).not.toHaveBeenCalled();
    expect(mocks.downloadBlob).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "JPG 压缩" }));
    await waitFor(() => expect(mocks.downloadBlob).toHaveBeenCalledWith(expect.any(Blob), "endfieldize.jpg"));
    expect(mocks.renderStillBlob).toHaveBeenLastCalledWith(expect.any(TestImage), expect.any(Object), "image/jpeg", 0.98);

    await user.click(screen.getByRole("button", { name: "PNG 无损" }));
    await waitFor(() => expect(mocks.downloadBlob).toHaveBeenCalledWith(expect.any(Blob), "endfieldize.png"));
    expect(mocks.renderStillBlob).toHaveBeenLastCalledWith(expect.any(TestImage), expect.any(Object), "image/png", undefined);

    await user.click(screen.getByText("高级导出"));
    await user.click(screen.getByRole("button", { name: "WEBM" }));
    await waitFor(() => expect(mocks.downloadVideo).toHaveBeenCalledWith(expect.any(Blob), "endfieldize.webm"));

    await user.click(screen.getByRole("button", { name: ".LIVP" }));
    await waitFor(() => expect(mocks.downloadBlob).toHaveBeenCalledTimes(3));

    const [blob, filename] = mocks.downloadBlob.mock.calls[2] as [Blob, string];
    expect(blob.type).toBe("application/octet-stream");
    expect(filename).toBe("endfieldize.livp");
  });

  it("shows a localized unsupported message when mp4 export is unavailable", async () => {
    const user = userEvent.setup();
    mocks.exportVideo.mockRejectedValueOnce(new Error("MP4 video recording is unavailable in this browser"));
    render(<App />);

    const uploadInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(uploadInput, new File(["image"], "sample.png", { type: "image/png" }));
    await waitFor(() => expect(screen.getByText("sample.png")).toBeTruthy());

    await user.click(screen.getByRole("button", { name: "MP4" }));

    expect(mocks.exportVideo).toHaveBeenCalledWith(expect.objectContaining({ format: "mp4" }));
    await waitFor(() => expect(screen.getByText("当前浏览器不支持 MP4 导出。请在高级导出中使用 WEBM。")).toBeTruthy());
    expect(mocks.downloadVideo).not.toHaveBeenCalled();
  });

  it("uses source aspect for non-16:9 image preview and export state", async () => {
    const user = userEvent.setup();
    TestImage.nextNaturalWidth = 900;
    TestImage.nextNaturalHeight = 1200;
    render(<App />);

    const uploadInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(uploadInput, new File(["image"], "portrait.png", { type: "image/png" }));
    await waitFor(() => expect(screen.getByText("portrait.png")).toBeTruthy());

    const canvas = document.querySelector("canvas") as HTMLCanvasElement;
    await waitFor(() => expect(canvas.width).toBe(960));
    expect(canvas.height).toBe(1280);
    expect(mocks.renderComposition).toHaveBeenLastCalledWith(
      expect.objectContaining({
        state: expect.objectContaining({
          motion: expect.objectContaining({ outputAspect: "source" }),
          export: expect.objectContaining({ width: 1440, height: 1920 }),
        }),
      }),
    );
  });

  it("exports high resolution stills at the uploaded source long edge", async () => {
    const user = userEvent.setup();
    TestImage.nextNaturalWidth = 4032;
    TestImage.nextNaturalHeight = 3024;
    render(<App />);

    const uploadInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(uploadInput, new File(["image"], "large.jpg", { type: "image/jpeg" }));
    await waitFor(() => expect(screen.getByText("large.jpg")).toBeTruthy());

    await user.click(screen.getByRole("button", { name: "JPG 压缩" }));
    await waitFor(() => expect(mocks.downloadBlob).toHaveBeenCalledWith(expect.any(Blob), "endfieldize.jpg"));
    expect(mocks.renderStillBlob).toHaveBeenLastCalledWith(
      expect.any(TestImage),
      expect.objectContaining({
        export: expect.objectContaining({ width: 4032, height: 3024 }),
      }),
      "image/jpeg",
      0.98,
    );
  });
});
