/**
 * Dış bağlantı `rel` politikası (SEO + güvenlik)
 *
 * - **Düzenlenmiş arayüz linkleri** (bilet, Spotify, kaynak sayfa, sosyal): `nofollow` KULLANMAYIN.
 *   Google, yalnızca güvenilir dış siteye normal bağlantı vermenin sitenize zarar vermediğini;
 *   tüm çıkışlara nofollow eklemenin sıralamanızı “koruduğu” efsanesinin geçersiz olduğunu belirtir.
 * - **Güvenlik:** `target="_blank"` ile mutlaka `noopener` (ve pratikte `noreferrer`) kullanın.
 * - **Reklam:** `sponsored` — bkz. `AdSlot`.
 * - **Zengin metin / kullanıcı HTML:** dış `http(s)` linklerine `nofollow ugc` + `noopener noreferrer` (spam ve UGC sinyali).
 */
export const EXTERNAL_LINK_REL_EDITORIAL = 'noopener noreferrer';

/** DOMPurify ile sanitize edilen HTML içindeki harici linkler için */
export const EXTERNAL_LINK_REL_RICH_TEXT = 'noopener noreferrer nofollow ugc';
