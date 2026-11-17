import { NextResponse } from "next/server";
import { ApiError, handleApiError, requireRole } from "@/lib/api";
import {
  getVendorCloudinaryFolder,
  isCloudinaryConfigured,
  uploadToCloudinary,
} from "@/lib/cloudinary";
import { connectDB } from "@/lib/db";
import { MediaModel } from "@/models/Media";
import { User } from "@/models/User";

export async function GET(request: Request) {
  try {
    const session = await requireRole(["vendor", "admin"]);
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const limit = Math.min(60, Math.max(1, Number(url.searchParams.get("limit") ?? 24)));
    const search = url.searchParams.get("q")?.trim();

    await connectDB();

    const query: Record<string, unknown> = {};
    if (session.user.role === "vendor") {
      query.vendor = session.user.id;
    } else {
      const vendorFilter = url.searchParams.get("vendor");
      if (vendorFilter) query.vendor = vendorFilter;
    }

    if (search) {
      query.$or = [
        { originalFilename: { $regex: search, $options: "i" } },
        { altText: { $regex: search, $options: "i" } },
        { vendorName: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    const [items, total, userDoc] = await Promise.all([
      MediaModel.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      MediaModel.countDocuments(query),
      User.findById(session.user.id).lean(),
    ]);

    const storeIdentifier =
      userDoc?.vendorProfile?.storeSlug ||
      userDoc?.vendorProfile?.storeName ||
      session.user.name ||
      "vendor";
    const vendorFolder = getVendorCloudinaryFolder(storeIdentifier);

    return NextResponse.json({
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      cloudinaryConfigured: isCloudinaryConfigured(),
      vendorFolder,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole(["vendor", "admin"]);
    await connectDB();

    const userDoc = await User.findById(session.user.id).lean();
    const vendorName = userDoc?.vendorProfile?.storeName || session.user.name || "Vendor";
    const storeIdentifier =
      userDoc?.vendorProfile?.storeSlug ||
      userDoc?.vendorProfile?.storeName ||
      session.user.name ||
      "vendor";
    const vendorFolder = getVendorCloudinaryFolder(storeIdentifier);

    const contentType = request.headers.get("content-type") || "";

    let fileBuffer: Buffer | null = null;
    let fileName = "";
    let mimeType = "image/jpeg";
    let altText = "";
    let tags: string[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) throw new ApiError(400, "No file provided in form data.");

      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      fileName = file.name || "image";
      mimeType = file.type || "image/jpeg";
      altText = String(formData.get("altText") || "");
      const rawTags = String(formData.get("tags") || "");
      tags = rawTags ? rawTags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean) : [];
    } else {
      // JSON body with data URL / base64 or remote URL
      const body = await request.json();
      if (body.dataUrl) {
        const matches = body.dataUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          throw new ApiError(400, "Invalid base64 data URL.");
        }
        mimeType = matches[1];
        fileBuffer = Buffer.from(matches[2], "base64");
        fileName = body.fileName || "uploaded-image";
      } else if (body.url) {
        // Direct media reference registration
        const newMedia = await MediaModel.create({
          vendor: session.user.id,
          vendorName,
          vendorFolder,
          url: body.url,
          secureUrl: body.url,
          publicId: `external_${Date.now()}`,
          originalFilename: body.fileName || "external-image",
          format: "jpg",
          bytes: 0,
          altText: body.altText || "",
          tags: body.tags || [],
        });
        return NextResponse.json({ media: newMedia, configured: isCloudinaryConfigured() }, { status: 201 });
      } else {
        throw new ApiError(400, "Provide either a file or a valid image URL/dataUrl.");
      }
      altText = body.altText || "";
      tags = Array.isArray(body.tags) ? body.tags : [];
    }

    if (!fileBuffer) {
      throw new ApiError(400, "No file data received.");
    }

    // Check if Cloudinary is configured
    if (isCloudinaryConfigured()) {
      const result = await uploadToCloudinary(fileBuffer, {
        folder: vendorFolder,
        filename: fileName.replace(/\.[^/.]+$/, ""),
        tags: [storeIdentifier, ...tags],
      });

      const media = await MediaModel.create({
        vendor: session.user.id,
        vendorName,
        vendorFolder,
        url: result.url,
        secureUrl: result.secure_url,
        publicId: result.public_id,
        originalFilename: fileName,
        format: result.format,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
        resourceType: result.resource_type,
        altText,
        tags,
      });

      return NextResponse.json({ media, configured: true }, { status: 201 });
    } else {
      // Fallback mode when Cloudinary keys are not yet present in environment
      // We store a base64 Data URL so the vendor can continue testing smoothly
      const base64Data = fileBuffer.toString("base64");
      const dataUri = `data:${mimeType};base64,${base64Data}`;
      const mockPublicId = `demo_${vendorFolder.replace(/\//g, "_")}_${Date.now()}`;

      const media = await MediaModel.create({
        vendor: session.user.id,
        vendorName,
        vendorFolder,
        url: dataUri,
        secureUrl: dataUri,
        publicId: mockPublicId,
        originalFilename: fileName,
        format: mimeType.split("/")[1] || "jpg",
        bytes: fileBuffer.length,
        altText,
        tags,
      });

      return NextResponse.json(
        {
          media,
          configured: false,
          warning:
            "Cloudinary credentials missing in .env.local. Saved preview in demo mode. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET for live Cloudinary storage.",
        },
        { status: 201 },
      );
    }
  } catch (error) {
    return handleApiError(error);
  }
}
