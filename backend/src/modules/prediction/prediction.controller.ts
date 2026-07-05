import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import * as predictionService from "./prediction.service";

export const getPrediction = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await predictionService.getPrediction(
      req.params.id,
      req.user!,
    );
    res.json({ status: "success", data: { prediction: result } });
  },
);
