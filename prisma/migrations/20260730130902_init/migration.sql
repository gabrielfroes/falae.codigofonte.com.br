-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('instagram', 'youtube', 'facebook');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('conectado', 'expirado', 'erro');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'membro');

-- CreateEnum
CREATE TYPE "AutomationScope" AS ENUM ('todos_posts', 'posts_especificos');

-- CreateEnum
CREATE TYPE "AutomationStatus" AS ENUM ('ativa', 'pausada');

-- CreateEnum
CREATE TYPE "MatchMode" AS ENUM ('exato', 'contem');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('sem_match', 'match', 'ignorado_blocklist', 'ignorado_proprio_perfil');

-- CreateEnum
CREATE TYPE "DeliveryTipo" AS ENUM ('resposta_publica', 'dm');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('enviado', 'falhou', 'expirado', 'rate_limited');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'membro',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invites" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "aceito_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "external_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "access_token_encrypted" TEXT NOT NULL,
    "token_expires_at" TIMESTAMP(3),
    "status" "AccountStatus" NOT NULL DEFAULT 'conectado',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automations" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "scope" "AutomationScope" NOT NULL DEFAULT 'todos_posts',
    "post_ids" JSONB,
    "status" "AutomationStatus" NOT NULL DEFAULT 'pausada',
    "delay_min_seconds" INTEGER NOT NULL DEFAULT 5,
    "delay_max_seconds" INTEGER NOT NULL DEFAULT 30,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keywords" (
    "id" TEXT NOT NULL,
    "automation_id" TEXT NOT NULL,
    "termo" TEXT NOT NULL,
    "match_mode" "MatchMode" NOT NULL DEFAULT 'contem',

    CONSTRAINT "keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_reply_templates" (
    "id" TEXT NOT NULL,
    "automation_id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,

    CONSTRAINT "public_reply_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dm_templates" (
    "id" TEXT NOT NULL,
    "automation_id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "link" TEXT NOT NULL,

    CONSTRAINT "dm_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "automation_id" TEXT,
    "account_id" TEXT NOT NULL,
    "external_comment_id" TEXT NOT NULL,
    "external_media_id" TEXT NOT NULL,
    "autor_username" TEXT NOT NULL,
    "autor_external_id" TEXT NOT NULL,
    "texto_comentario" TEXT NOT NULL,
    "status" "EventStatus" NOT NULL,
    "payload_raw" JSONB NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliveries" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "tipo" "DeliveryTipo" NOT NULL,
    "status" "DeliveryStatus" NOT NULL,
    "motivo_falha" TEXT,
    "external_message_id" TEXT,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidade_id" TEXT NOT NULL,
    "diff" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocklist" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "external_username" TEXT,
    "external_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "invites_token_key" ON "invites"("token");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_platform_external_id_key" ON "accounts"("platform", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "dm_templates_automation_id_key" ON "dm_templates"("automation_id");

-- CreateIndex
CREATE UNIQUE INDEX "events_external_comment_id_key" ON "events"("external_comment_id");

-- AddForeignKey
ALTER TABLE "automations" ADD CONSTRAINT "automations_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keywords" ADD CONSTRAINT "keywords_automation_id_fkey" FOREIGN KEY ("automation_id") REFERENCES "automations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_reply_templates" ADD CONSTRAINT "public_reply_templates_automation_id_fkey" FOREIGN KEY ("automation_id") REFERENCES "automations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dm_templates" ADD CONSTRAINT "dm_templates_automation_id_fkey" FOREIGN KEY ("automation_id") REFERENCES "automations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_automation_id_fkey" FOREIGN KEY ("automation_id") REFERENCES "automations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocklist" ADD CONSTRAINT "blocklist_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
