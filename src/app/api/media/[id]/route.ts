import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";
import { ApiError, handleApiError, requireRole } from "@/lib/api";
import { deleteFromCloudinary } from "@/lib/cloudinary";
import { connectDB } from "@/lib/db";
import { MediaModel } from "@/models/Media";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireRole(["vendor", "admin"]);
    const { id } = await context.params;
    if (!isValidObjectId(id)) throw new ApiError(400, "Invalid media ID.");

    await connectDB();
    const query =
      session.user.role === "admin"
        ? { _id: id }
        : { _id: id, vendor: session.user.id };

    const media = await MediaModel.findOne(query);
    if (!media) throw new ApiError(404, "Media asset not found or not owned by you.");

    // Delete from Cloudinary if publicId exists and is not demo
    if (media.publicId && !media.publicId.startsWith("demo_") && !media.publicId.startsWith("external_")) {
      try {
        await deleteFromCloudinary(media.publicId);
      } catch (err) {
        console.warn("Failed to delete asset from Cloudinary:", err);
      }
    }

    await MediaModel.deleteOne({ _id: id });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    return handleApiError(error);
  }
}
