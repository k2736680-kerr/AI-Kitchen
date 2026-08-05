import { ImageSourcePropType, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import type { CatalogIngredientId } from '@ai-kitchen/shared';

const SINGLE_IMAGE: Readonly<Record<string, ImageSourcePropType>> = {
  tomato: require('../../../assets/images/ai-kitchen/ingredients/tomato.png'),
  egg: require('../../../assets/images/ai-kitchen/ingredients/egg.png'),
  onion: require('../../../assets/images/ai-kitchen/ingredients/onion.png'),
  scallion: require('../../../assets/images/ai-kitchen/ingredients/scallion.png'),
  rice: require('../../../assets/images/ai-kitchen/ingredients/rice.png'),
  'chicken-breast': require('../../../assets/images/ai-kitchen/ingredients/chicken-breast.png'),
  tofu: require('../../../assets/images/ai-kitchen/ingredients/tofu.png'),
  carrot: require('../../../assets/images/ai-kitchen/ingredients/carrot.png'),
  potato: require('../../../assets/images/ai-kitchen/ingredients/potato.png'),
  ginger: require('../../../assets/images/ai-kitchen/ingredients/ginger.png'),
  garlic: require('../../../assets/images/ai-kitchen/ingredients/garlic.png'),
  noodles: require('../../../assets/images/ai-kitchen/ingredients/noodles.png'),
  shrimp: require('../../../assets/images/ai-kitchen/ingredients/shrimp.png'),
  pork: require('../../../assets/images/ai-kitchen/ingredients/pork.png'),
  'shiitake-mushroom': require('../../../assets/images/ai-kitchen/ingredients/shiitake-mushroom.png'),
  cucumber: require('../../../assets/images/ai-kitchen/ingredients/cucumber.png'),
  milk: require('../../../assets/images/ai-kitchen/ingredients/milk.png'),
};

const ATLAS_COLUMNS = 6;
const THUMBNAIL_SIZE = 92;
type AtlasPosition = readonly [column: number, row: number];

const INGREDIENT_ATLAS_POSITIONS = {
  egg: [0, 0],
  tomato: [1, 0],
  onion: [2, 0],
  carrot: [3, 0],
  'green-pepper': [4, 0],
  potato: [5, 0],
  broccoli: [0, 1],
  'napa-cabbage': [1, 1],
  spinach: [2, 1],
  cucumber: [3, 1],
  'shiitake-mushroom': [4, 1],
  eggplant: [5, 1],
  corn: [0, 2],
  rice: [1, 2],
  noodles: [2, 2],
  bread: [3, 2],
  oats: [4, 2],
  pasta: [5, 2],
  'dumpling-wrapper': [0, 3],
  'chicken-breast': [1, 3],
  pork: [2, 3],
  beef: [3, 3],
  lamb: [4, 3],
  bacon: [5, 3],
  sausage: [0, 4],
  shrimp: [1, 4],
  salmon: [2, 4],
  'white-fish': [3, 4],
  squid: [4, 4],
  scallop: [5, 4],
  tofu: [0, 5],
  soybeans: [1, 5],
  tempeh: [2, 5],
  milk: [3, 5],
  cheese: [4, 5],
  yogurt: [5, 5],
} satisfies Readonly<Partial<Record<CatalogIngredientId, AtlasPosition>>>;

const ingredientAtlas = require('../../../assets/images/ai-kitchen/ingredients/ingredient-atlas-v1.png');

export function IngredientThumbnail({ ingredientId }: { readonly ingredientId: string }) {
  const single = SINGLE_IMAGE[ingredientId];
  if (single) {
    return (
      <Image
        accessibilityIgnoresInvertColors
        source={single}
        contentFit="contain"
        cachePolicy="memory-disk"
        placeholder="rgba(0,0,0,0.04)"
        transition={120}
        style={styles.image}
      />
    );
  }
  const position = (INGREDIENT_ATLAS_POSITIONS as Readonly<Record<string, AtlasPosition>>)[ingredientId];
  if (!position) return <View style={styles.placeholder} />;
  const [column, row] = position;
  const atlasSize = THUMBNAIL_SIZE * ATLAS_COLUMNS;

  return (
    <View style={styles.viewport}>
      <Image
        accessibilityIgnoresInvertColors
        source={ingredientAtlas}
        contentFit="fill"
        cachePolicy="memory-disk"
        placeholder="rgba(0,0,0,0.04)"
        style={{
          height: atlasSize,
          left: -column * THUMBNAIL_SIZE,
          position: 'absolute',
          top: -row * THUMBNAIL_SIZE,
          width: atlasSize,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', height: '100%' },
  viewport: {
    alignSelf: 'center',
    borderRadius: 14,
    height: THUMBNAIL_SIZE,
    overflow: 'hidden',
    width: THUMBNAIL_SIZE,
  },
  placeholder: { width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE, opacity: 0.3 },
});
