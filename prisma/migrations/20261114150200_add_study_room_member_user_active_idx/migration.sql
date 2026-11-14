-- CreateIndex
CREATE INDEX IF NOT EXISTS "StudyRoomMember_userId_isActive_idx" ON "StudyRoomMember"("userId", "isActive");
