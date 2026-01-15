# 🚀 QUICK REFERENCE: WHATSAPP API TESTING

## 📱 NÚMEROS

```
FROM (Test Number - Meta):  +1 555 156 1260
TO (Tu número):             573042734424
```

---

## 🎯 COMANDOS RÁPIDOS

### 1. Enviar mensaje a tu número

```bash
# El Test Number (+1 555 156 1260) enviará a 573042734424
curl -i -X POST \
  https://graph.facebook.com/v22.0/985474321308699/messages \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -H 'Content-Type: application/json' \
  -d '{
    "messaging_product": "whatsapp",
    "to": "573042734424",
    "type": "text",
    "text": {
      "body": "Hola desde Meta API Testing 👋"
    }
  }'
```

### 2. Ver logs del webhook

```bash
railway logs --tail 50
```

### 3. Verificar stats

```bash
curl -s https://api.kdsapp.site/api/stats | python3 -m json.tool
```

---

## 🔄 FLUJOS DE PRUEBA

### A. API → Tu número
```
Test Number (+1 555 156 1260) ───→ 573042734424
        ↑ FROM                         ↑ TO
```
**Resultado**: Recibes mensaje en WhatsApp desde `+1 555 156 1260`

### B. Tu número → Test Number
```
573042734424 ───→ Test Number (+1 555 156 1260)
   ↑ FROM                ↑ TO
```
**Resultado**: Tu servidor recibe webhook con tu mensaje

---

## ✅ CHECKLIST RÁPIDO

- [ ] Token generado (60 min)
- [ ] Webhook listening ON
- [ ] Mensaje enviado exitosamente
- [ ] Mensaje recibido en WhatsApp
- [ ] Logs del webhook verificados

---

## 🔗 LINKS

- **API Testing**: https://developers.facebook.com/apps/849706941272247/whatsapp-business/wa-dev-console/
- **Webhook**: https://api.kdsapp.site/webhook/whatsapp
- **Health**: https://api.kdsapp.site/health

---

**Guías completas**:
- `GUIA-API-TESTING-WHATSAPP.md` - Guía paso a paso
- `CONCEPTO-FROM-TO-WHATSAPP.md` - Explicación detallada FROM/TO
