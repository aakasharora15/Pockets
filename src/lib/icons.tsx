import type { Icon as PhIcon, IconWeight } from '@phosphor-icons/react';
import {
  AirplaneTiltIcon, AppleLogoIcon, ArrowDownIcon, ArrowUpIcon, BabyIcon, BackspaceIcon, BagSimpleIcon, BasketIcon,
  BedIcon, BookOpenIcon, CalendarBlankIcon, CameraIcon, CloudArrowUpIcon, ClockCounterClockwiseIcon, ArrowsLeftRightIcon, ScanIcon, UploadSimpleIcon, ImageIcon, FileArrowDownIcon, CarIcon, CaretDownIcon, CaretLeftIcon, CaretRightIcon, CaretUpDownIcon,
  CaretUpIcon, CheckIcon, CoffeeIcon, CoinsIcon, CopyIcon, CurrencyCircleDollarIcon, CurrencyGbpIcon, DeviceMobileIcon,
  DogIcon, DotsThreeIcon, DownloadSimpleIcon, DropHalfIcon, EnvelopeSimpleIcon, ExportIcon, FirstAidIcon,
  ForkKnifeIcon, GameControllerIcon, GasPumpIcon, GearSixIcon, GiftIcon, GoogleLogoIcon, GraduationCapIcon,
  HandHeartIcon, HeartbeatIcon, HourglassSimpleIcon, HouseIcon, InfoIcon, LightningIcon, ListIcon, LockKeyIcon,
  LockSimpleIcon, MagnifyingGlassIcon, MinusCircleIcon, MusicNotesIcon, NotePencilIcon, PawPrintIcon, PencilSimpleIcon,
  PiggyBankIcon, PillIcon, PlantIcon, PlusIcon, QrCodeIcon, ReceiptIcon, RepeatIcon, ScissorsIcon,
  SlidersHorizontalIcon, SparkleIcon, SquaresFourIcon, StarIcon, TagIcon, TargetIcon, TextTIcon, TicketIcon,
  TrainSimpleIcon, TrashIcon, TShirtIcon, UserCircleIcon, UserIcon, UserPlusIcon, UsersThreeIcon, WifiHighIcon,
  WifiSlashIcon, WineIcon, WrenchIcon, XIcon,
} from '@phosphor-icons/react';
import type { CSSProperties } from 'react';

/** Phosphor icons by their web-font name (the part after "ph-"). */
const REGISTRY: Record<string, PhIcon> = {
  'airplane-tilt': AirplaneTiltIcon, 'apple-logo': AppleLogoIcon, 'arrow-down': ArrowDownIcon, 'arrow-up': ArrowUpIcon,
  baby: BabyIcon, backspace: BackspaceIcon, 'bag-simple': BagSimpleIcon, basket: BasketIcon, bed: BedIcon,
  'book-open': BookOpenIcon, 'calendar-blank': CalendarBlankIcon, camera: CameraIcon, 'cloud-arrow-up': CloudArrowUpIcon,
  'clock-counter-clockwise': ClockCounterClockwiseIcon, 'arrows-left-right': ArrowsLeftRightIcon, scan: ScanIcon,
  'upload-simple': UploadSimpleIcon, image: ImageIcon, 'file-arrow-down': FileArrowDownIcon, car: CarIcon, 'caret-down': CaretDownIcon,
  'caret-left': CaretLeftIcon, 'caret-right': CaretRightIcon, 'caret-up-down': CaretUpDownIcon, 'caret-up': CaretUpIcon,
  check: CheckIcon, coffee: CoffeeIcon, coins: CoinsIcon, copy: CopyIcon, 'currency-circle-dollar': CurrencyCircleDollarIcon,
  'currency-gbp': CurrencyGbpIcon, 'device-mobile': DeviceMobileIcon, dog: DogIcon, 'dots-three': DotsThreeIcon,
  'download-simple': DownloadSimpleIcon, 'drop-half': DropHalfIcon, 'envelope-simple': EnvelopeSimpleIcon, export: ExportIcon,
  'first-aid': FirstAidIcon, 'fork-knife': ForkKnifeIcon, 'game-controller': GameControllerIcon, 'gas-pump': GasPumpIcon,
  'gear-six': GearSixIcon, gift: GiftIcon, 'google-logo': GoogleLogoIcon, 'graduation-cap': GraduationCapIcon,
  'hand-heart': HandHeartIcon, heartbeat: HeartbeatIcon, 'hourglass-simple': HourglassSimpleIcon, house: HouseIcon,
  info: InfoIcon, lightning: LightningIcon, list: ListIcon, 'lock-key': LockKeyIcon, 'lock-simple': LockSimpleIcon,
  'magnifying-glass': MagnifyingGlassIcon, 'minus-circle': MinusCircleIcon, 'music-notes': MusicNotesIcon,
  'note-pencil': NotePencilIcon, 'paw-print': PawPrintIcon, 'pencil-simple': PencilSimpleIcon, 'piggy-bank': PiggyBankIcon,
  pill: PillIcon, plant: PlantIcon, plus: PlusIcon, 'qr-code': QrCodeIcon, receipt: ReceiptIcon, repeat: RepeatIcon,
  scissors: ScissorsIcon, 'sliders-horizontal': SlidersHorizontalIcon, sparkle: SparkleIcon, 'squares-four': SquaresFourIcon,
  star: StarIcon, tag: TagIcon, target: TargetIcon, 'text-t': TextTIcon, ticket: TicketIcon, 'train-simple': TrainSimpleIcon,
  trash: TrashIcon, 't-shirt': TShirtIcon, 'user-circle': UserCircleIcon, user: UserIcon, 'user-plus': UserPlusIcon,
  'users-three': UsersThreeIcon, 'wifi-high': WifiHighIcon, 'wifi-slash': WifiSlashIcon, wine: WineIcon, wrench: WrenchIcon,
  x: XIcon,
};

export interface IconProps {
  name: string;
  weight?: IconWeight;
  /** Font size in the design; Phosphor glyphs fill a 1em box. Omit to inherit 1em. */
  size?: number;
  color?: string;
  style?: CSSProperties;
  label?: string;
}

/** Renders a Phosphor icon the same way the design's `<i class="ph ph-name">` does. */
export function Icon({ name, weight = 'regular', size, color, style, label }: IconProps) {
  const C = REGISTRY[name] ?? DotsThreeIcon;
  return (
    <C
      weight={weight}
      size={size ?? '1em'}
      color={color ?? 'currentColor'}
      style={{ display: 'block', flex: 'none', ...style }}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}

/** Icons offered when creating a category (screen 19d), in design order. */
export const CATEGORY_ICON_CHOICES = [
  'paw-print', 'baby', 'house', 'car', 'airplane-tilt', 'heartbeat', 'coffee', 'wine', 'graduation-cap', 'game-controller',
  'music-notes', 't-shirt', 'scissors', 'first-aid', 'pill', 'gas-pump', 'wrench', 'plant', 'dog', 'device-mobile',
  'wifi-high', 'piggy-bank', 'hand-heart', 'star',
];
