/*
  Warnings:

  - A unique constraint covering the columns `[code,stateId]` on the table `District` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code,districtId]` on the table `SubDistrict` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "District_code_stateId_key" ON "District"("code", "stateId");

-- CreateIndex
CREATE UNIQUE INDEX "SubDistrict_code_districtId_key" ON "SubDistrict"("code", "districtId");

-- CreateIndex
CREATE INDEX "Village_name_idx" ON "Village"("name");
