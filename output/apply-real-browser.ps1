$ErrorActionPreference = "Stop"

$root = "C:\Users\bodega 1\Desktop\workspace\career-ops"
$cv = Join-Path $root "output\cv-gian-programador-ti.pdf"

$apps = @(
  @{
    Company = "Identia"
    Role = "Programador Junior en Python e IA"
    Url = "https://www.getonbrd.com/empleos/programacion/programador-junior-en-python-e-ia-identia-remote"
    Message = @"
Hola equipo de Identia:

Me interesa postular al cargo de Programador Junior en Python e IA. Estoy en formación como Analista Programador y busco incorporarme al área TI en un rol donde pueda aportar con Python, APIs REST, SQL, automatización y aprendizaje continuo.

Mi portafolio incluye proyectos como Exelcior Apolo, una aplicación Python para automatizar transformación, validación e impresión de Excel, e Inventario App, un sistema Python con SQLAlchemy, SQLite/PostgreSQL, PDFs, CSV y arquitectura por capas. También desarrollé AMILAB, con frontend en React/TypeScript y backend serverless con TypeScript, Firebase/Firestore, endpoints REST, Zod, logging y tests.

Me interesa especialmente el cruce entre programación, automatización, datos e IA aplicada a procesos reales.

Saludos,
Gian Lucas San Martín Agurto
"@
  }
  @{
    Company = "Valkiria"
    Role = "Analista de Sistemas Junior / Fullstack Developer Junior"
    Url = "https://cl.linkedin.com/jobs/view/%F0%9F%9A%80-buscamos-analista-de-sistemas-junior-at-valkiria-4373472059"
    Message = @"
Hola equipo de Valkiria:

Me interesa postular al cargo de Analista de Sistemas Junior / Fullstack Developer Junior. Estoy orientando mi carrera hacia programación en el área TI y cuento con proyectos prácticos de frontend, backend, APIs REST, datos y automatización.

Destaco AMILAB, proyecto full stack con frontend en React, TypeScript y Vite, y backend serverless en TypeScript con Vercel Functions, Firebase/Firestore, endpoints REST, validaciones con Zod, logging y tests. También tengo experiencia con Python, SQL, Git/GitHub y construcción de herramientas para procesos operativos reales.

Aunque .NET/C# no es mi stack principal actual, tengo base en Java, TypeScript, backend, APIs y SQL para adaptarme con rapidez al stack del equipo.

Saludos,
Gian Lucas San Martín Agurto
"@
  }
)

Write-Host ""
Write-Host "Postulaciones LinkedIn/Get on Board en navegador real" -ForegroundColor Cyan
Write-Host "CV: $cv"
Write-Host ""

if (-not (Test-Path $cv)) {
  throw "No existe el CV PDF: $cv"
}

Start-Process explorer.exe "/select,`"$cv`""

for ($i = 0; $i -lt $apps.Count; $i++) {
  $num = $i + 1
  Write-Host "$num. $($apps[$i].Company) - $($apps[$i].Role)"
}

Write-Host ""
Write-Host "Escribe el número de la oferta para abrirla y copiar su mensaje. Enter abre todas." -ForegroundColor Yellow
$choice = Read-Host "Opción"

if ([string]::IsNullOrWhiteSpace($choice)) {
  foreach ($app in $apps) {
    Start-Process $app.Url
  }
  $apps[0].Message | Set-Clipboard
  Write-Host "Abrí todas las ofertas. Copié al portapapeles el mensaje de $($apps[0].Company)." -ForegroundColor Green
  exit 0
}

$idx = [int]$choice - 1
if ($idx -lt 0 -or $idx -ge $apps.Count) {
  throw "Opción inválida."
}

$selected = $apps[$idx]
Start-Process $selected.Url
$selected.Message | Set-Clipboard
Write-Host "Abierta: $($selected.Company) - $($selected.Role)" -ForegroundColor Green
Write-Host "Mensaje copiado al portapapeles." -ForegroundColor Green
Write-Host "CV mostrado en Explorador para arrastrar/subir: $cv" -ForegroundColor Green
