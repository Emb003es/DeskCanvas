//! Milestone 1 proof of concept: list icons, save 3 icon PNGs, read flags,
//! move one icon +100px, then restore it. `poc move` leaves it moved.
use desktop_core::*;

fn main() -> windows::core::Result<()> {
    com_init();
    let keep_moved = std::env::args().any(|a| a == "move");
    for m in monitors() {
        println!("monitor {m:?}");
    }
    let d = Desktop::open()?;
    let size = d.icon_size()?;
    let (auto, snap) = d.flags()?;
    println!("icon_size={size} auto_arrange={auto} snap_to_grid={snap}");

    let icons = d.icons()?;
    println!("{} icons", icons.len());
    for ic in &icons {
        println!("  ({:>6},{:>5}) {}  [{}]", ic.x, ic.y, ic.name, ic.id);
    }
    std::fs::create_dir_all("poc-out").ok();
    for (i, ic) in icons.iter().take(3).enumerate() {
        let png = d.icon_png(&ic.id, size)?;
        std::fs::write(format!("poc-out/icon{i}.png"), &png).ok();
    }

    let Some(first) = icons.first() else { return Ok(()) };
    d.move_icons(&[(first.id.clone(), first.x + 100, first.y + 100)])?;
    let after = d.icons()?.into_iter().find(|i| i.id == first.id).unwrap();
    println!("moved '{}' ({},{}) -> ({},{})", first.name, first.x, first.y, after.x, after.y);
    assert_eq!((after.x, after.y), (first.x + 100, first.y + 100), "move did not land");
    if !keep_moved {
        std::thread::sleep(std::time::Duration::from_secs(2));
        d.move_icons(&[(first.id.clone(), first.x, first.y)])?;
        let back = d.icons()?.into_iter().find(|i| i.id == first.id).unwrap();
        assert_eq!((back.x, back.y), (first.x, first.y), "restore did not land");
        println!("restored OK");
    }
    Ok(())
}
