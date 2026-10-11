import './NavIcon.css';

// Renders a navigation icon from navConfig. Fields (all optional):
//   light  PNG shown when idle
//   dark   PNG shown when active
//   Svg    SVG component (<Svg filled />) used for whichever state has no PNG
//   tight  true when `light` is tightly cropped (80px icons) rather than the
//          padded 144px "nav bar" exports, so it's drawn at glyph size
function NavIcon({ icon, active }) {
  if (active && icon.dark) {
    return (
      <span className="nav-icon">
        <img src={icon.dark} alt="" className="nav-icon__img--dark" />
      </span>
    );
  }

  if (icon.Svg && (active || !icon.light)) {
    const { Svg } = icon;
    return (
      <span className="nav-icon">
        <Svg filled={active} />
      </span>
    );
  }

  return (
    <span className="nav-icon">
      <img src={icon.light} alt="" className={icon.tight ? 'nav-icon__img--tight' : 'nav-icon__img--light'} />
    </span>
  );
}

export default NavIcon;
