import type { Request, Response } from "express";
import { getCompanyProfile, saveCompanyProfile } from "../services/company.service";

export async function getCompanyHandler(_req: Request, res: Response) {
  try {
    const company = await getCompanyProfile();
    res.status(200).json(company);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    res.status(400).json({ error: message });
  }
}

export async function getCompanyPublicHandler(_req: Request, res: Response) {
  try {
    const company = await getCompanyProfile();
    res.status(200).json({
      name: company.name,
      logoBase64: company.logoBase64,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    res.status(400).json({ error: message });
  }
}

export async function updateCompanyHandler(req: Request, res: Response) {
  try {
    const company = await saveCompanyProfile(req.body || {});
    res.status(200).json(company);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    res.status(400).json({ error: message });
  }
}
