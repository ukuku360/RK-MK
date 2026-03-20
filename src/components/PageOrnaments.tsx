import paddleSvg from '../assets/table-tennis-paddle.svg';
import tableSvg from '../assets/table-tennis-table.svg';

export function PageOrnaments() {
  return (
    <div className="page-ornaments" aria-hidden="true">
      <img className="page-ornament page-ornament-paddle" src={paddleSvg} alt="" />
      <img className="page-ornament page-ornament-table" src={tableSvg} alt="" />
    </div>
  );
}
