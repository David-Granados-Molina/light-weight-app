import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { AuthService } from '../../core/services/auth.service';
import { ExerciseService } from '../../core/services/exercise.service';
import {
  Category,
  Difficulty,
  Exercise,
  ExerciseProfile,
  ExerciseType,
  FreeExerciseImage,
  InputType,
} from '../../core/models/exercise.model';
import { CATEGORY_COLOR, CATEGORY_LABEL, INPUT_TYPE_LABEL, TYPE_LABEL } from '../../core/models/labels';
import { videoEmbedUrl } from '../../core/utils/video';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';

type Filtro = 'todos' | Category;

interface Tarjeta {
  exercise: Exercise;
  profile: ExerciseProfile | null;
  imagen: string | null;
}

const DIFICULTADES: { value: Difficulty; label: string }[] = [
  { value: 'iniciacion', label: 'Iniciación' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzado', label: 'Avanzado' },
];

/** Ancho máximo al que se reduce una imagen subida antes de guardarla. */
const ANCHO_MAX = 640;
const CALIDAD = 0.72;

@Component({
  selector: 'app-exercise-gallery',
  imports: [FormsModule, ConfirmDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './exercise-gallery.html',
  styleUrl: './exercise-gallery.css',
})
export class ExerciseGallery {
  private readonly exerciseService = inject(ExerciseService);
  private readonly authService = inject(AuthService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly categoryColor = CATEGORY_COLOR;
  readonly categoryLabel = CATEGORY_LABEL;
  readonly typeLabel = TYPE_LABEL;
  readonly inputTypeLabel = INPUT_TYPE_LABEL;
  readonly dificultades = DIFICULTADES;

  readonly isAdmin = computed(() => this.authService.currentUser()?.isAdmin ?? false);

  readonly catalog = signal<Exercise[]>([]);
  readonly profiles = signal<ExerciseProfile[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);

  readonly filtro = signal<Filtro>('todos');
  readonly busqueda = signal('');

  readonly filtroChips: { key: Filtro; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'gym', label: 'Gym' },
    { key: 'calistenia', label: 'Calistenia' },
  ];

  readonly tarjetas = computed<Tarjeta[]>(() => {
    const porEjercicio = new Map(this.profiles().map((p) => [p.exerciseId, p]));
    const filtro = this.filtro();
    const texto = this.busqueda().trim().toLowerCase();

    return this.catalog()
      .filter((e) => (filtro === 'todos' ? true : e.category === filtro))
      .filter((e) => (texto ? e.name.toLowerCase().includes(texto) : true))
      .map((exercise) => {
        const profile = porEjercicio.get(exercise.id) ?? null;
        return { exercise, profile, imagen: profile?.imageData ?? profile?.imageUrl ?? null };
      });
  });

  readonly conImagen = computed(() => this.tarjetas().filter((t) => t.imagen).length);

  /* --- Ficha abierta -------------------------------------------------------- */

  readonly abierta = signal<Tarjeta | null>(null);
  readonly guardando = signal(false);
  readonly guardarError = signal<string | null>(null);

  readonly formImagen = signal<string | null>(null);
  readonly formImagenUrl = signal<string | null>(null);
  readonly formImagenAutor = signal<string | null>(null);
  readonly formImagenLicencia = signal<string | null>(null);
  readonly formVideo = signal('');
  readonly formDescripcion = signal('');
  readonly formConsejos = signal('');
  readonly formMaterial = signal('');
  readonly formDificultad = signal<Difficulty | ''>('');

  readonly formNombre = signal('');
  readonly formCategoria = signal<Category>('gym');
  readonly formTipo = signal<ExerciseType>('empuje');
  readonly formModo = signal<InputType>('peso');

  readonly tipos: ExerciseType[] = ['empuje', 'tiron', 'pierna', 'core', 'cardio'];
  readonly modos: InputType[] = ['peso', 'reps', 'tiempo', 'emom', 'min'];
  readonly categorias: Category[] = ['gym', 'calistenia'];

  /** Vídeo de la ficha, listo para incrustar; null si el enlace no se puede ver aquí dentro. */
  readonly videoEmbed = computed(() => {
    const embed = videoEmbedUrl(this.formVideo());
    return embed ? this.sanitizer.bypassSecurityTrustResourceUrl(embed) : null;
  });

  readonly imagenPrevia = computed(() => this.formImagen() ?? this.formImagenUrl());

  /* --- Buscador de imágenes libres ------------------------------------------ */

  readonly consultaImagen = signal('');
  readonly buscandoImagen = signal(false);
  readonly candidatos = signal<FreeExerciseImage[]>([]);
  readonly sinCandidatos = signal(false);

  /* --- Alta y baja ---------------------------------------------------------- */

  readonly creando = signal(false);
  readonly borrarTarget = signal<Exercise | null>(null);
  readonly borrarError = signal<string | null>(null);

  constructor() {
    this.cargar();
  }

  private cargar(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.exerciseService.getAll().subscribe({
      next: (lista) => {
        this.catalog.set(lista);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
    this.exerciseService.getProfiles().subscribe({
      next: (lista) => this.profiles.set(lista),
      error: () => this.profiles.set([]),
    });
  }

  selectFiltro(key: Filtro): void {
    this.filtro.set(key);
  }

  onBuscar(event: Event): void {
    this.busqueda.set((event.target as HTMLInputElement).value);
  }

  /* --- Abrir y cerrar la ficha ---------------------------------------------- */

  abrir(tarjeta: Tarjeta): void {
    this.abierta.set(tarjeta);
    this.creando.set(false);
    this.guardarError.set(null);
    this.candidatos.set([]);
    this.sinCandidatos.set(false);

    this.formImagen.set(tarjeta.profile?.imageData ?? null);
    this.formImagenUrl.set(tarjeta.profile?.imageUrl ?? null);
    this.formImagenAutor.set(tarjeta.profile?.imageAuthor ?? null);
    this.formImagenLicencia.set(tarjeta.profile?.imageLicense ?? null);
    this.formVideo.set(tarjeta.profile?.videoUrl ?? '');
    this.formDescripcion.set(tarjeta.profile?.description ?? '');
    this.formConsejos.set(tarjeta.profile?.tips ?? '');
    this.formMaterial.set(tarjeta.profile?.equipment ?? '');
    this.formDificultad.set(tarjeta.profile?.difficulty ?? '');

    this.consultaImagen.set(tarjeta.exercise.name);
    this.formNombre.set(tarjeta.exercise.name);
    this.formCategoria.set(tarjeta.exercise.category);
    this.formTipo.set(tarjeta.exercise.type);
    this.formModo.set(tarjeta.exercise.inputType);
  }

  nuevo(): void {
    this.abierta.set(null);
    this.creando.set(true);
    this.guardarError.set(null);
    this.candidatos.set([]);
    this.sinCandidatos.set(false);

    this.formImagen.set(null);
    this.formImagenUrl.set(null);
    this.formImagenAutor.set(null);
    this.formImagenLicencia.set(null);
    this.formVideo.set('');
    this.formDescripcion.set('');
    this.formConsejos.set('');
    this.formMaterial.set('');
    this.formDificultad.set('');

    this.consultaImagen.set('');
    this.formNombre.set('');
    this.formCategoria.set('gym');
    this.formTipo.set('empuje');
    this.formModo.set('peso');
  }

  cerrar(): void {
    this.abierta.set(null);
    this.creando.set(false);
  }

  /* --- Imagen ---------------------------------------------------------------- */

  async onImagenElegida(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const fichero = input.files?.[0];
    input.value = '';
    if (!fichero) return;

    try {
      const dataUrl = await this.reducir(fichero);
      this.formImagen.set(dataUrl);
      this.formImagenUrl.set(null);
      this.formImagenAutor.set(null);
      this.formImagenLicencia.set(null);
    } catch {
      this.guardarError.set('No se ha podido leer esa imagen.');
    }
  }

  /**
   * Reduce la imagen en el navegador antes de guardarla: una foto de móvil son
   * varios megas y en la base no cabe ni hace falta.
   */
  private reducir(fichero: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onerror = () => reject(new Error('lectura'));
      lector.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('imagen'));
        img.onload = () => {
          const escala = Math.min(1, ANCHO_MAX / img.width);
          const lienzo = document.createElement('canvas');
          lienzo.width = Math.round(img.width * escala);
          lienzo.height = Math.round(img.height * escala);
          const ctx = lienzo.getContext('2d');
          if (!ctx) return reject(new Error('canvas'));
          ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height);
          resolve(lienzo.toDataURL('image/jpeg', CALIDAD));
        };
        img.src = String(lector.result);
      };
      lector.readAsDataURL(fichero);
    });
  }

  quitarImagen(): void {
    this.formImagen.set(null);
    this.formImagenUrl.set(null);
    this.formImagenAutor.set(null);
    this.formImagenLicencia.set(null);
  }

  buscarImagenes(): void {
    const consulta = (this.consultaImagen().trim() || this.formNombre()).trim();
    if (consulta.length < 2) return;

    this.buscandoImagen.set(true);
    this.sinCandidatos.set(false);
    this.exerciseService.searchFreeImages(consulta).subscribe({
      next: (lista) => {
        this.candidatos.set(lista);
        this.sinCandidatos.set(lista.length === 0);
        this.buscandoImagen.set(false);
      },
      error: () => {
        this.candidatos.set([]);
        this.sinCandidatos.set(true);
        this.buscandoImagen.set(false);
      },
    });
  }

  elegirCandidata(candidata: FreeExerciseImage): void {
    this.formImagenUrl.set(candidata.image);
    this.formImagenAutor.set(candidata.author);
    this.formImagenLicencia.set(candidata.license);
    this.formImagen.set(null);
    this.candidatos.set([]);
  }

  /** Crédito que acompaña a la imagen; CC-BY-SA obliga a citar al autor. */
  readonly creditoImagen = computed(() => {
    const autor = this.formImagenAutor();
    const licencia = this.formImagenLicencia();
    if (!autor && !licencia) return null;
    return [autor, licencia].filter(Boolean).join(' · ');
  });

  /* --- Guardar ---------------------------------------------------------------- */

  guardar(): void {
    if (this.guardando()) return;
    this.guardarError.set(null);

    if (this.creando()) {
      const nombre = this.formNombre().trim();
      if (nombre.length < 2) {
        this.guardarError.set('El nombre necesita al menos dos letras.');
        return;
      }
      this.guardando.set(true);
      this.exerciseService
        .create({
          name: nombre,
          category: this.formCategoria(),
          type: this.formTipo(),
          inputType: this.formModo(),
        })
        .subscribe({
          next: (exercise) => {
            this.catalog.update((lista) => [...lista, exercise].sort((a, b) => a.name.localeCompare(b.name, 'es')));
            this.guardarFicha(exercise.id);
          },
          error: (e) => {
            this.guardando.set(false);
            this.guardarError.set(
              e?.status === 409 ? 'Ya existe un ejercicio con ese nombre.' : 'No se ha podido crear el ejercicio.',
            );
          },
        });
      return;
    }

    const abierta = this.abierta();
    if (!abierta) return;
    this.guardando.set(true);

    if (this.isAdmin() && this.catalogoCambiado(abierta.exercise)) {
      this.exerciseService
        .update(abierta.exercise.id, {
          name: this.formNombre().trim(),
          category: this.formCategoria(),
          type: this.formTipo(),
          inputType: this.formModo(),
        })
        .subscribe({
          next: (exercise) => {
            this.catalog.update((lista) =>
              lista.map((e) => (e.id === exercise.id ? exercise : e)).sort((a, b) => a.name.localeCompare(b.name, 'es')),
            );
            this.guardarFicha(abierta.exercise.id);
          },
          error: (e) => {
            this.guardando.set(false);
            this.guardarError.set(
              e?.status === 409 ? 'Ya existe un ejercicio con ese nombre.' : 'No se ha podido guardar el ejercicio.',
            );
          },
        });
      return;
    }

    this.guardarFicha(abierta.exercise.id);
  }

  private catalogoCambiado(exercise: Exercise): boolean {
    return (
      this.formNombre().trim() !== exercise.name ||
      this.formCategoria() !== exercise.category ||
      this.formTipo() !== exercise.type ||
      this.formModo() !== exercise.inputType
    );
  }

  private guardarFicha(exerciseId: string): void {
    this.exerciseService
      .saveProfile(exerciseId, {
        imageData: this.formImagen(),
        imageUrl: this.formImagenUrl(),
        imageAuthor: this.formImagenAutor(),
        imageLicense: this.formImagenLicencia(),
        videoUrl: this.formVideo().trim() || null,
        description: this.formDescripcion().trim() || null,
        tips: this.formConsejos().trim() || null,
        equipment: this.formMaterial().trim() || null,
        difficulty: this.formDificultad() || null,
      })
      .subscribe({
        next: (profile) => {
          this.profiles.update((lista) => [...lista.filter((p) => p.exerciseId !== exerciseId), profile]);
          this.guardando.set(false);
          this.cerrar();
        },
        error: () => {
          this.guardando.set(false);
          this.guardarError.set('No se ha podido guardar la ficha. Si has subido una imagen, prueba con una más ligera.');
        },
      });
  }

  /* --- Borrar del catálogo ------------------------------------------------------ */

  pedirBorrado(exercise: Exercise, event: Event): void {
    event.stopPropagation();
    this.borrarError.set(null);
    this.borrarTarget.set(exercise);
  }

  cancelarBorrado(): void {
    this.borrarTarget.set(null);
  }

  confirmarBorrado(): void {
    const exercise = this.borrarTarget();
    if (!exercise) return;

    this.exerciseService.delete(exercise.id).subscribe({
      next: () => {
        this.catalog.update((lista) => lista.filter((e) => e.id !== exercise.id));
        this.profiles.update((lista) => lista.filter((p) => p.exerciseId !== exercise.id));
        this.borrarTarget.set(null);
      },
      error: (e) => {
        const enEntrenos = e?.error?.enEntrenos ?? 0;
        const enRutinas = e?.error?.enRutinas ?? 0;
        this.borrarTarget.set(null);
        this.borrarError.set(
          e?.status === 409
            ? `No se puede borrar: está en ${enEntrenos} ${enEntrenos === 1 ? 'entreno' : 'entrenos'} y ${enRutinas} ${enRutinas === 1 ? 'rutina' : 'rutinas'}. Borrar el ejercicio dejaría ese historial sin referencia.`
            : 'No se ha podido borrar el ejercicio.',
        );
      },
    });
  }
}
