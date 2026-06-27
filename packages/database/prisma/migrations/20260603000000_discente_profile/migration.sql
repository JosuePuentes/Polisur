-- Perfil físico del discente en officers
ALTER TABLE "officers" ADD COLUMN "tipoSangre" VARCHAR(8);
ALTER TABLE "officers" ADD COLUMN "alturaCm" DOUBLE PRECISION;
ALTER TABLE "officers" ADD COLUMN "pesoKg" DOUBLE PRECISION;
ALTER TABLE "officers" ADD COLUMN "colorPiel" VARCHAR(40);
ALTER TABLE "officers" ADD COLUMN "contextura" VARCHAR(40);

-- Documentos adjuntos del expediente académico
CREATE TABLE "discente_documents" (
    "id" TEXT NOT NULL,
    "filename" VARCHAR(120) NOT NULL,
    "originalName" VARCHAR(200),
    "mimeType" VARCHAR(80) NOT NULL,
    "label" VARCHAR(80),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "officerId" TEXT NOT NULL,

    CONSTRAINT "discente_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "discente_documents_filename_key" ON "discente_documents"("filename");
CREATE INDEX "idx_discente_doc_officer_btree" ON "discente_documents"("officerId");

ALTER TABLE "discente_documents" ADD CONSTRAINT "discente_documents_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "officers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
