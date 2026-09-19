export async function captureCoordinates(): Promise<{ latitude: number; longitude: number; accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocalização não suportada neste dispositivo.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
      },
      (error) => {
        const messages: Record<number, string> = {
          1: 'Permissão de GPS negada. Ative a localização do celular.',
          2: 'Sinal de GPS indisponível no momento.',
          3: 'Tempo esgotado ao obter a localização.',
        }
        reject(new Error(messages[error.code] ?? 'Não foi possível capturar o GPS.'))
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 5000,
      },
    )
  })
}
