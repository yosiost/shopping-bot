import { useState, useEffect } from 'react';

export default function Toast({ msg, animKey }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!msg) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2600);
    return () => clearTimeout(t);
  }, [animKey]);

  if (!visible || !msg) return null;
  return <div className="toast">{msg}</div>;
}
