import React, { useState } from 'react';
import { View, Text, Image, Linking, StyleSheet, type ImageSourcePropType, type ImageStyle } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { AppButton } from '../components/AppButton';
import { ShareQrCode } from '../components/ShareQrCode';
import { useThemeColors } from '../hooks/useThemeColors';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useTranslation } from '../i18n/useTranslation';
import { nameInitials } from '../utils/patientDisplay';
import { spacing, fontSize, font, lineHeight, layout } from '../styles/theme';

/** Zooms into part of a square photo: `zoom` 2 shows half of it, `x`/`y` (0–1) slide that window across. */
interface PhotoCrop {
  zoom: number;
  x: number;
  y: number;
}

interface TeamMember {
  name: string;
  linkedin: string;
  /** Square image from `src/assets/profile-pictures/`; `null` shows the member's initials instead. */
  photo: ImageSourcePropType | null;
  /** Brings the face forward in full-body shots; omitted shows the whole photo. */
  crop?: PhotoCrop;
}

const TEAM: TeamMember[] = [
  {
    name: 'Gustavo Crevelari Monteiro Porto',
    linkedin: 'https://www.linkedin.com/in/gustavocrevelari/',
    photo: require('../assets/profile-pictures/gus.jpg'),
    // The file has a light 1–2 px border on its right and bottom edges; this trims it off.
    crop: { zoom: 1.02, x: 0, y: 0 },
  },
  {
    name: 'Victor Sabelli Rocha Batista',
    linkedin: 'https://www.linkedin.com/in/victorsabelli/',
    photo: require('../assets/profile-pictures/sabelli.jpg'),
    crop: { zoom: 2, x: 0.44, y: 0 },
  },
  {
    name: 'Lucca de Araujo Gomes',
    linkedin: 'https://www.linkedin.com/in/luccaagomes02/',
    photo: require('../assets/profile-pictures/lucca.png'),
  },
  {
    name: 'Rafaela Ferreira Santos',
    linkedin: 'https://www.linkedin.com/in/rafaela-ferreira-santos-8470051b7/',
    photo: require('../assets/profile-pictures/rafa.png'),
    crop: { zoom: 1.3, x: 0.5, y: 0.1 },
  },
];

const GRID_GAP = spacing.md;
// Space ShareQrCode adds around the code: its card padding plus the white quiet zone, on both sides.
const QR_FRAME = 2 * (spacing.sm + spacing.md);
// Large enough to scan from across a room on a projector; these URLs are 29–33 modules wide.
const QR_MAX = 200;

/** Every member in one row on a presentation screen, two on a tablet or narrow window, one on a phone. */
function columnsFor(gridWidth: number) {
  if (gridWidth >= 1000) return 4;
  if (gridWidth >= 540) return 2;
  return 1;
}

/** `https://www.linkedin.com/in/foo/` → `linkedin.com/in/foo`. */
function displayUrl(url: string) {
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

const FULL_PHOTO: PhotoCrop = { zoom: 1, x: 0, y: 0 };

function cropStyle({ zoom, x, y }: PhotoCrop): ImageStyle {
  // Percentages of the square frame, so the crop holds at any card width.
  return {
    position: 'absolute',
    width: `${zoom * 100}%`,
    height: `${zoom * 100}%`,
    left: `${-(zoom - 1) * x * 100}%`,
    top: `${-(zoom - 1) * y * 100}%`,
  };
}

/** "Configurações → Sobre nós". Static content, no backend call; registered in both role stacks. */
export function AboutUsScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const wide = useBreakpoint() === 'wide';
  // Columns follow the grid's own width, not the window's: the sidebar takes part of a wide window.
  const [gridWidth, setGridWidth] = useState(0);
  const columns = columnsFor(gridWidth);
  const cardWidth = gridWidth ? (gridWidth - GRID_GAP * (columns - 1)) / columns : undefined;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('aboutUs.title')} />

      {/* Wider than the usual form column so all four cards fit side by side on a presentation screen. */}
      <ScreenContainer style={styles.content}>
        <View style={[styles.hero, wide && styles.heroWide]}>
          <Text accessibilityRole="header" style={[styles.brandName, wide && styles.brandNameWide, { color: colors.ink }]}>
            {t('common.appName')}
          </Text>
          <Text accessibilityRole="header" style={[styles.teamTitle, wide && styles.teamTitleWide, { color: colors.ink }]}>
            {t('aboutUs.teamSection')}
          </Text>
        </View>

        <View style={styles.grid} onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}>
          {cardWidth
            ? TEAM.map((member) => (
                <MemberCard
                  key={member.linkedin}
                  member={member}
                  width={cardWidth}
                  qrSize={Math.min(QR_MAX, cardWidth - 2 * spacing.lg - QR_FRAME)}
                />
              ))
            : null}
        </View>
      </ScreenContainer>
    </View>
  );
}

function MemberCard({ member, width, qrSize }: { member: TeamMember; width: number; qrSize: number }) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const photoLabel = t('aboutUs.photoLabel', { name: member.name });

  const openProfile = () => {
    Linking.openURL(member.linkedin).catch(() => {
      /* Nothing actionable client-side if the OS can't open it; the QR code still works. */
    });
  };

  return (
    <AppCard style={{ ...styles.member, width }}>
      <View
        style={[styles.photoFrame, { backgroundColor: colors.sunken }]}
        accessible
        accessibilityRole="image"
        accessibilityLabel={photoLabel}
      >
        {member.photo ? (
          <Image
            source={member.photo}
            // Always explicit percentage sizing: on web, absoluteFill leaves the image at its file's pixel size.
            style={cropStyle(member.crop ?? FULL_PHOTO)}
            resizeMode="cover"
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.initials, { backgroundColor: colors.accentTint }]}>
            <Text style={[styles.initialsText, { color: colors.accent }]}>{nameInitials(member.name)}</Text>
          </View>
        )}
      </View>

      <View style={styles.memberBody}>
        {/* Grows so the QR codes and buttons line up across a row when one name wraps to two lines. */}
        <Text style={[styles.memberName, { color: colors.ink }]}>{member.name}</Text>

        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={t('aboutUs.qrLabel', { name: member.name })}
        >
          <ShareQrCode value={member.linkedin} size={qrSize} />
        </View>

        <View style={styles.links}>
          <Text style={[styles.handle, { color: colors.inkSecondary }]} numberOfLines={1}>
            {displayUrl(member.linkedin)}
          </Text>
          <AppButton
            title={t('aboutUs.openLinkedIn')}
            variant="secondary"
            icon="logo-linkedin"
            onPress={openProfile}
            accessibilityLabel={t('aboutUs.openLinkedInLabel', { name: member.name })}
            style={styles.linkButton}
          />
        </View>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { maxWidth: layout.contentMax },
  hero: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  heroWide: { paddingTop: spacing.xxl, paddingBottom: spacing.xxl },
  brandName: { fontSize: 32, ...font('bold'), lineHeight: 32 * lineHeight.tight },
  brandNameWide: { fontSize: 44, lineHeight: 44 * lineHeight.tight },
  teamTitle: { fontSize: fontSize.xl, ...font('bold'), textAlign: 'center' },
  teamTitleWide: { fontSize: fontSize.xxl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  member: { marginBottom: 0, padding: 0, overflow: 'hidden' },
  photoFrame: { width: '100%', aspectRatio: 1, overflow: 'hidden' },
  initials: { alignItems: 'center', justifyContent: 'center' },
  initialsText: { fontSize: 48, ...font('semibold') },
  memberBody: { flexGrow: 1, alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  memberName: {
    flexGrow: 1,
    fontSize: fontSize.xl,
    ...font('bold'),
    lineHeight: fontSize.xl * lineHeight.snug,
    textAlign: 'center',
  },
  links: { alignSelf: 'stretch', alignItems: 'center', gap: spacing.xs },
  handle: { fontSize: fontSize.sm, textAlign: 'center', maxWidth: '100%' },
  linkButton: { alignSelf: 'stretch' },
});
