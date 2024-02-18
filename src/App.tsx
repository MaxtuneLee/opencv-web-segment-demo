import { useEffect, useRef, useState } from "react";
import "./App.css";
import * as cv from "@techstark/opencv-js";
import { Button } from "./components/ui/button";
import { EffectInfo } from "./types/editor";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";

function App() {
  const fileSelectRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resultCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasSize = useRef({ width: 500, height: 500 });
  const scale = useRef(1);
  const cvImg = useRef<cv.Mat>();
  const shadowcvImg = useRef<cv.Mat>();
  const [fileUrl, setFileUrl] = useState("");
  const [drag, setDrag] = useState(false);
  const [rect, setRect] = useState({
    startX: 0,
    startY: 0,
    width: 0,
    height: 0,
  });
  const [effectInfo, setEffectInfo] = useState<EffectInfo>({
    erosionRate: 0,
    dilationRate: 0,
  });

  const handleImgLoad = (imgsrc: HTMLImageElement) => {
    if (canvasRef.current) {
      scale.current = Math.min(
        ((canvasRef.current as HTMLCanvasElement).width as number) /
          imgsrc.width,
        ((canvasRef.current as HTMLCanvasElement).height as number) /
          imgsrc.height
      );
      canvasRef.current.width = imgsrc.width * scale.current;
      canvasRef.current.height = imgsrc.height * scale.current;
      resultCanvasRef.current!.width = imgsrc.width * scale.current;
      resultCanvasRef.current!.height = imgsrc.height * scale.current;
      cvImg.current = cv.imread(imgsrc as HTMLImageElement);
      cv.imshow("frame", cvImg.current);
      shadowcvImg.current = new cv.Mat();
      cv.cvtColor(cvImg.current, shadowcvImg.current, cv.COLOR_RGBA2RGB, 0);
      // cv.cvtColor(cvImg.current, cvImg.current, cv.COLOR_RGBA2RGB, 0);
    }
  };
  const handleImgSegment = () => {
    const result = new cv.Mat();
    const bgdModel = new cv.Mat();
    const fgdModel = new cv.Mat();
    const roiRect = new cv.Rect(
      rect.startX,
      rect.startY,
      rect.width,
      rect.height
    );
    cv.grabCut(
      shadowcvImg.current as cv.Mat,
      result,
      roiRect,
      bgdModel,
      fgdModel,
      2,
      cv.GC_INIT_WITH_RECT
    );
    // cv.medianBlur(result, result, 3);
    // cv.bilateralFilter(result, result, 9, 75, 75);
    cv.erode(
      result,
      result,
      new cv.Mat(),
      new cv.Point(-1, -1),
      effectInfo.erosionRate
    );
    cv.dilate(
      result,
      result,
      new cv.Mat(),
      new cv.Point(-1, -1),
      effectInfo.dilationRate
    );

    const fg = cvImg.current?.clone();
    const view = fg?.data as Uint8Array;
    const step = 4 * result.cols;
    for (let x = 0; x < result.rows; x++) {
      for (let y = 0; y < result.cols; y++) {
        const category = result.ucharAt(x, y);
        if (category === cv.GC_BGD || category === cv.GC_PR_BGD) {
          view[x * step + y * 4] = 255;
          view[x * step + y * 4 + 1] = 255;
          view[x * step + y * 4 + 2] = 255;
          view[x * step + y * 4 + 3] = 0;
        }
      }
    }
    cv.imshow("result_frame", fg as cv.Mat);
  };
  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setDrag(false);
  };
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setDrag(true);
    const pos = getMousePos(e);
    setRect({ startX: pos.x, startY: pos.y, width: 0, height: 0 });
  };
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (drag) {
      const pos = getMousePos(e);
      setRect({
        ...rect,
        width: pos.x - rect.startX,
        height: pos.y - rect.startY,
      });
      if (rect.width && rect.height && rect.startX && rect.startY) {
        const p1 = { x: rect.startX, y: rect.startY };
        const p2 = {
          x: rect.startX + rect.width,
          y: rect.startY + rect.height,
        };
        const color = new cv.Scalar(0, 255, 0, 255);
        const imgWithRect = cvImg.current?.clone();
        cv.rectangle(imgWithRect as cv.Mat, p1, p2, color, 2, 8, 0);
        cv.imshow("frame", imgWithRect as cv.Mat);
      }
    }
  };
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    return {
      x: e.clientX - rect!.left,
      y: e.clientY - rect!.top,
    };
  };
  const handleSaveResultCanvas = () => {
    const link = document.createElement("a");
    link.download = "result.png";
    link.href = resultCanvasRef.current?.toDataURL() as string;
    link.click();
  };

  useEffect(() => {
    if (
      imgRef.current &&
      imgRef.current.height > 0 &&
      imgRef.current.width > 0 &&
      imgRef.current.src !== location.href
    ) {
      handleImgLoad(imgRef.current as HTMLImageElement);
    }
  }, [fileUrl]);
  useEffect(() => {
    if (cvImg.current) {
      handleImgSegment();
    }
  }, [effectInfo]);
  useEffect(() => {
    setTimeout(() => {
      setFileUrl("/example.jpg");
    }, 50);
  }, []);
  return (
    <>
      <div className="flex justify-center gap-3 mb-5">
        <Button
          variant={"outline"}
          onClick={() => {
            fileSelectRef.current?.click();
          }}
        >
          选择图像
        </Button>
        <Button
          variant={"outline"}
          onClick={() => {
            handleImgSegment();
          }}
        >
          执行分割
        </Button>
        <Button
          onClick={() => {
            handleSaveResultCanvas();
          }}
        >
          保存图片
        </Button>
      </div>
      <input
        type="file"
        onChange={(e) => {
          setFileUrl(URL.createObjectURL((e.target.files as FileList)[0]));
        }}
        ref={fileSelectRef}
        multiple={false}
        className=" hidden"
      />
      <div
        style={{
          display: "flex",
          gap: "10px",
          justifyContent: "center",
        }}
      >
        <div
          className="absolute top-[1000px] left-[1000px]"
          style={{ visibility: "hidden" }}
        >
          <img
            src={fileUrl}
            ref={imgRef}
            width={canvasSize.current.width}
            height={canvasSize.current.height}
            onLoad={(e) => {
              handleImgLoad(e.target as HTMLImageElement);
            }}
          />
          origin
        </div>
        <div className="frame">
          <canvas
            id="frame"
            ref={canvasRef}
            width={canvasSize.current.width}
            onMouseUp={handleCanvasMouseUp}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
          />
          source canvas
        </div>
        <div className="frame">
          <canvas
            id="result_frame"
            ref={resultCanvasRef}
            width={200}
            // onMouseUp={handleCanvasMouseUp}
            // onMouseDown={handleCanvasMouseDown}
            // onMouseMove={handleCanvasMouseMove}
          />
          result canvas
        </div>
      </div>
      <div className="flex gap-2 *:w-[200px] justify-center mt-10">
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="erosionRate">腐蚀</Label>
          <Input
            type="number"
            id="erosionRate"
            value={effectInfo.erosionRate}
            min={0}
            onChange={(e) => {
              setEffectInfo({
                ...effectInfo,
                erosionRate: parseInt(e.target.value),
              });
            }}
          />
        </div>
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="dilationRate">膨胀</Label>
          <Input
            type="number"
            id="dilationRate"
            value={effectInfo.dilationRate}
            min={0}
            width={200}
            onChange={(e) => {
              setEffectInfo({
                ...effectInfo,
                dilationRate: parseInt(e.target.value),
              });
            }}
          />
        </div>
      </div>
    </>
  );
}

export default App;
