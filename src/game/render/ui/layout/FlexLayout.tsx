import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';

interface BoxProps {
  width: number;
  height: number;
  mr?: number;
  mb?: number;
  centerAnchor?: boolean;
  children?: ReactNode;
}

interface FlexProps {
  size: [number, number, number];
  position?: [number, number, number];
  flexDirection?: 'row' | 'column';
  flexWrap?: 'wrap' | 'nowrap';
  alignItems?: 'center' | 'start';
  justifyContent?: 'center' | 'start';
  children?: ReactNode;
}

export function Box({ children }: BoxProps) {
  return <group>{children}</group>;
}

function asBoxElement(child: ReactNode): ReactElement<BoxProps> | undefined {
  if (!isValidElement<BoxProps>(child)) {
    return undefined;
  }

  const props = child.props;
  if (typeof props?.width !== 'number' || typeof props?.height !== 'number') {
    return undefined;
  }

  return child;
}

function layoutColumn(children: ReactElement<BoxProps>[], size: [number, number, number]) {
  const [width] = size;
  let cursorY = 0;

  return children.map((child) => {
    const { width: childWidth, height: childHeight, mb = 0 } = child.props;
    const x = width * 0.5;
    const y = -(cursorY + childHeight * 0.5);
    cursorY += childHeight + mb;
    return { child, x, y, childWidth, childHeight };
  });
}

function layoutRow(children: ReactElement<BoxProps>[], size: [number, number, number], wrap: boolean, alignItems: 'center' | 'start', justifyContent: 'center' | 'start') {
  const [width, height] = size;
  if (!wrap) {
    const totalWidth = children.reduce((sum, child, index) => {
      const gap = index < children.length - 1 ? child.props.mr ?? 0 : 0;
      return sum + child.props.width + gap;
    }, 0);
    const startX = justifyContent === 'center' ? (width - totalWidth) * 0.5 : 0;
    let cursorX = startX;

    return children.map((child) => {
      const { width: childWidth, height: childHeight, mr = 0 } = child.props;
      const x = cursorX + childWidth * 0.5;
      const y = alignItems === 'center' ? -height * 0.5 : -childHeight * 0.5;
      cursorX += childWidth + mr;
      return { child, x, y, childWidth, childHeight };
    });
  }

  let cursorX = 0;
  let cursorY = 0;
  let rowHeight = 0;
  let rowBottomGap = 0;

  return children.map((child) => {
    const { width: childWidth, height: childHeight, mr = 0, mb = 0 } = child.props;

    if (cursorX > 0 && cursorX + childWidth > width + 1e-6) {
      cursorX = 0;
      cursorY += rowHeight + rowBottomGap;
      rowHeight = 0;
      rowBottomGap = 0;
    }

    const x = cursorX + childWidth * 0.5;
    const y = -(cursorY + childHeight * 0.5);

    rowHeight = Math.max(rowHeight, childHeight);
    rowBottomGap = Math.max(rowBottomGap, mb);
    cursorX += childWidth + mr;

    return { child, x, y, childWidth, childHeight };
  });
}

export function Flex({
  size,
  position = [0, 0, 0],
  flexDirection = 'row',
  flexWrap = 'nowrap',
  alignItems = 'start',
  justifyContent = 'start',
  children
}: FlexProps) {
  const boxChildren = Children.toArray(children)
    .map(asBoxElement)
    .filter((child): child is ReactElement<BoxProps> => Boolean(child));

  const placements =
    flexDirection === 'column'
      ? layoutColumn(boxChildren, size)
      : layoutRow(boxChildren, size, flexWrap === 'wrap', alignItems, justifyContent);

  return (
    <group position={position}>
      {placements.map(({ child, x, y }, index) => (
        <group key={child.key ?? index} position={[x, y, 0]}>
          {child.props.children}
        </group>
      ))}
    </group>
  );
}
