export function whatsappNumber(value:FormDataEntryValue|null) {
  const input=String(value??'').trim();
  if(!/^\+?[0-9\s().-]+$/.test(input))throw new Error('Masukkan nomor WhatsApp yang valid.');
  const digits=input.replace(/\D/g,'');
  const number=digits.startsWith('0')?'62'+digits.slice(1):digits;
  if(!/^[1-9][0-9]{7,14}$/.test(number))throw new Error('Masukkan nomor WhatsApp dengan kode negara atau awalan 08.');
  return number;
}
