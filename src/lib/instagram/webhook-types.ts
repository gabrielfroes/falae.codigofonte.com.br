// Formato do payload de webhook do campo "comments" da Instagram Platform.
// Baseado em docs/meta-api-notes.md — reconfirme contra um payload real antes
// de ir para produção (a Meta pode ajustar nomes de campos entre versões).

export interface InstagramWebhookPayload {
  object: string;
  entry: InstagramWebhookEntry[];
}

export interface InstagramWebhookEntry {
  id: string; // ID da conta profissional do Instagram que recebeu o evento
  time: number;
  changes: InstagramWebhookChange[];
}

export interface InstagramWebhookChange {
  field: string; // "comments" é o único campo que o Falae processa hoje
  value: InstagramCommentValue;
}

export interface InstagramCommentValue {
  id: string; // id do comentário
  text: string;
  from: {
    id: string;
    username?: string;
  };
  media: {
    id: string;
    media_product_type?: string;
  };
}
